import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie } from "hono/cookie";
import {
  authMiddleware,
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import type { MochaUser } from "@getmocha/users-service/shared";
import {
  CreateProjectSchema,
  TranscribeRequestSchema,
  TTSRequestSchema,
  type ProjectType,
  type DiagnosticInfo,
} from "@/shared/types";

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors());

// Auth routes
app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });
  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();
  if (!body.code) {
    return c.json({ error: "Código de autorização não fornecido" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60,
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get("/api/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Health check
app.get("/api/ping", async (c) => {
  return c.json({ ok: true });
});

// Get user's projects
app.get("/api/projects", authMiddleware, async (c) => {
  const user = c.get("user") as MochaUser;
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC"
  )
    .bind(user.id)
    .all();
  return c.json(results);
});

// Create new project
app.post("/api/projects", authMiddleware, async (c) => {
  const user = c.get("user") as MochaUser;
  const body = await c.req.json();
  const validated = CreateProjectSchema.parse(body);

  const result = await c.env.DB.prepare(
    `INSERT INTO projects (user_id, title, source_type, source_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
  )
    .bind(user.id, validated.title, validated.source_type, validated.source_url || null)
    .run();

  const project = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE id = ?"
  )
    .bind(result.meta.last_row_id)
    .first();

  return c.json(project);
});

// Get project by ID
app.get("/api/projects/:id", authMiddleware, async (c) => {
  const user = c.get("user") as MochaUser;
  const id = c.req.param("id");

  const project = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE id = ? AND user_id = ?"
  )
    .bind(id, user.id)
    .first();

  if (!project) {
    return c.json({ error: "Projeto não encontrado" }, 404);
  }

  return c.json(project);
});

// Upload file for project
app.post("/api/projects/:id/upload", authMiddleware, async (c) => {
  const user = c.get("user") as MochaUser;
  const id = c.req.param("id");

  const project = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE id = ? AND user_id = ?"
  )
    .bind(id, user.id)
    .first();

  if (!project) {
    return c.json({ error: "Projeto não encontrado" }, 404);
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return c.json({ error: "Arquivo não fornecido" }, 400);
  }

  // Check file size (50 MB limit)
  if (file.size > 50 * 1024 * 1024) {
    return c.json({ error: "Arquivo muito grande (máx. 50 MB)" }, 413);
  }

  // Check file type
  const validExtensions = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !validExtensions.includes(extension)) {
    return c.json({ 
      error: `Formato inválido. Use: ${validExtensions.join(', ')}` 
    }, 415);
  }

  // Upload to R2
  const fileKey = `projects/${id}/${file.name}`;
  await c.env.R2_BUCKET.put(fileKey, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  // Update project
  await c.env.DB.prepare(
    `UPDATE projects 
     SET file_key = ?, file_name = ?, file_size = ?, file_mime = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(fileKey, file.name, file.size, file.type, id)
    .run();

  return c.json({ success: true });
});

// Get file from project
app.get("/api/projects/:id/file", authMiddleware, async (c) => {
  const user = c.get("user") as MochaUser;
  const id = c.req.param("id");

  const project = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE id = ? AND user_id = ?"
  )
    .bind(id, user.id)
    .first() as ProjectType | null;

  if (!project || !project.file_key) {
    return c.json({ error: "Arquivo não encontrado" }, 404);
  }

  const object = await c.env.R2_BUCKET.get(project.file_key);
  if (!object) {
    return c.json({ error: "Arquivo não encontrado no storage" }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return c.body(object.body, { headers });
});

// Transcribe endpoint
app.post("/api/transcribe", authMiddleware, async (c) => {
  const user = c.get("user") as MochaUser;
  const body = await c.req.json();
  const { project_id } = TranscribeRequestSchema.parse(body);

  const project = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE id = ? AND user_id = ?"
  )
    .bind(project_id, user.id)
    .first() as ProjectType | null;

  if (!project) {
    return c.json({ error: "Projeto não encontrado" }, 404);
  }

  try {
    let audioBuffer: ArrayBuffer;
    let contentType: string;

    // Get audio data
    if (project.source_type === 'upload' && project.file_key) {
      const object = await c.env.R2_BUCKET.get(project.file_key);
      if (!object) {
        throw new Error("Arquivo não encontrado no storage");
      }
      audioBuffer = await object.arrayBuffer();
      contentType = project.file_mime || 'audio/mpeg';
    } else if (project.source_type === 'url' && project.source_url) {
      const response = await fetch(project.source_url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'MOBYTRANSCRIPT/1.0' },
      });

      if (!response.ok) {
        throw new Error(`URL retornou status ${response.status}`);
      }

      contentType = response.headers.get('content-type') || 'audio/mpeg';
      
      // Check if it's actually an audio/video file
      if (!contentType.startsWith('audio/') && !contentType.startsWith('video/')) {
        return c.json({ 
          error: "URL não é de arquivo direto. Use upload ou gere link direto." 
        }, 400);
      }

      audioBuffer = await response.arrayBuffer();
    } else {
      return c.json({ error: "Fonte de mídia não disponível" }, 400);
    }

    // Try AssemblyAI first
    if (c.env.ASSEMBLYAI_API_KEY) {
      try {
        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: {
            'Authorization': c.env.ASSEMBLYAI_API_KEY,
          },
          body: audioBuffer,
        });

        if (!uploadResponse.ok) {
          throw new Error(`AssemblyAI upload falhou: ${uploadResponse.status}`);
        }

        const { upload_url } = await uploadResponse.json() as { upload_url: string };

        const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
          method: 'POST',
          headers: {
            'Authorization': c.env.ASSEMBLYAI_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio_url: upload_url,
            language_code: 'pt',
          }),
        });

        const transcript = await transcriptResponse.json() as { id: string; status: string };
        const transcriptId = transcript.id;

        // Poll for completion
        let status = 'queued';
        let attempts = 0;
        const maxAttempts = 60;

        while (status === 'queued' || status === 'processing') {
          if (attempts >= maxAttempts) {
            throw new Error('Timeout aguardando transcrição');
          }

          await new Promise(resolve => setTimeout(resolve, 2000));

          const statusResponse = await fetch(
            `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
            {
              headers: {
                'Authorization': c.env.ASSEMBLYAI_API_KEY,
              },
            }
          );

          const statusData = await statusResponse.json() as { status: string; text?: string; error?: string };
          status = statusData.status;

          if (status === 'completed') {
            await c.env.DB.prepare(
              `UPDATE projects 
               SET transcript_text = ?, transcript_id = ?, provider_used = ?, updated_at = datetime('now')
               WHERE id = ?`
            )
              .bind(statusData.text, transcriptId, 'assemblyai', project_id)
              .run();

            return c.json({
              text: statusData.text,
              transcript_id: transcriptId,
              provider_used: 'assemblyai',
            });
          } else if (status === 'error') {
            throw new Error(statusData.error || 'Erro na transcrição');
          }

          attempts++;
        }
      } catch (error) {
        console.error('AssemblyAI failed:', error);
        // Continue to fallbacks
      }
    }

    // Fallback 1: OpenAI Whisper
    if (c.env.OPENAI_API_KEY) {
      try {
        const formData = new FormData();
        formData.append('file', new Blob([audioBuffer], { type: contentType }), 'audio.mp3');
        formData.append('model', 'whisper-1');
        formData.append('language', 'pt');
        formData.append('response_format', 'json');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`,
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json() as { text: string };
          
          await c.env.DB.prepare(
            `UPDATE projects 
             SET transcript_text = ?, provider_used = ?, updated_at = datetime('now')
             WHERE id = ?`
          )
            .bind(data.text, 'openai', project_id)
            .run();

          return c.json({
            text: data.text,
            provider_used: 'openai',
          });
        }
      } catch (error) {
        console.error('OpenAI failed:', error);
      }
    }

    // Fallback 2: Deepgram
    if (c.env.DEEPGRAM_API_KEY) {
      try {
        const response = await fetch(
          'https://api.deepgram.com/v1/listen?smart_format=true&language=pt-BR',
          {
            method: 'POST',
            headers: {
              'Authorization': `Token ${c.env.DEEPGRAM_API_KEY}`,
              'Content-Type': contentType,
            },
            body: audioBuffer,
          }
        );

        if (response.ok) {
          const data = await response.json() as { 
            results: { 
              channels: Array<{ 
                alternatives: Array<{ transcript: string }> 
              }> 
            } 
          };
          const text = data.results.channels[0].alternatives[0].transcript;

          await c.env.DB.prepare(
            `UPDATE projects 
             SET transcript_text = ?, provider_used = ?, updated_at = datetime('now')
             WHERE id = ?`
          )
            .bind(text, 'deepgram', project_id)
            .run();

          return c.json({
            text,
            provider_used: 'deepgram',
          });
        }
      } catch (error) {
        console.error('Deepgram failed:', error);
      }
    }

    // All providers failed
    const errorMsg = 'Todos os provedores de transcrição falharam. Verifique as chaves de API.';
    await c.env.DB.prepare(
      `UPDATE projects 
       SET provider_used = ?, last_error = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind('failed', errorMsg, project_id)
      .run();

    return c.json({ error: errorMsg }, 502);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    await c.env.DB.prepare(
      `UPDATE projects 
       SET last_error = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(errorMsg, project_id)
      .run();

    return c.json({ error: errorMsg }, 500);
  }
});

// Get subtitles
app.get("/api/subtitles/:format", authMiddleware, async (c) => {
  const user = c.get("user") as MochaUser;
  const format = c.req.param("format");
  const transcriptId = c.req.query("transcript_id");
  const projectId = c.req.query("project_id");

  if (format !== 'srt' && format !== 'vtt') {
    return c.json({ error: "Formato inválido" }, 400);
  }

  // If we have transcript ID from AssemblyAI, use it
  if (transcriptId && c.env.ASSEMBLYAI_API_KEY) {
    const response = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}/${format}`,
      {
        headers: {
          'Authorization': c.env.ASSEMBLYAI_API_KEY,
        },
      }
    );

    if (response.ok) {
      const content = await response.text();
      return c.text(content, 200, {
        'Content-Type': format === 'srt' ? 'application/x-subrip' : 'text/vtt',
        'Content-Disposition': `attachment; filename="legendas.${format}"`,
      });
    }
  }

  // Fallback: generate heuristic subtitles
  if (projectId) {
    const project = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?"
    )
      .bind(projectId, user.id)
      .first() as ProjectType | null;

    if (project && project.transcript_text) {
      const text = project.transcript_text;
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      
      let output = format === 'vtt' ? 'WEBVTT\n\n' : '';
      let startTime = 0;

      sentences.forEach((sentence, index) => {
        const duration = Math.max(2, Math.min(5, sentence.length / 20));
        const endTime = startTime + duration;

        if (format === 'srt') {
          output += `${index + 1}\n`;
          output += `${formatTime(startTime, 'srt')} --> ${formatTime(endTime, 'srt')}\n`;
          output += `${sentence.trim()}\n\n`;
        } else {
          output += `${formatTime(startTime, 'vtt')} --> ${formatTime(endTime, 'vtt')}\n`;
          output += `${sentence.trim()}\n\n`;
        }

        startTime = endTime;
      });

      return c.text(output, 200, {
        'Content-Type': format === 'srt' ? 'application/x-subrip' : 'text/vtt',
        'Content-Disposition': `attachment; filename="legendas.${format}"`,
      });
    }
  }

  return c.json({ error: "Legendas não disponíveis" }, 404);
});

// Text-to-speech
app.post("/api/tts", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { text, voice_id } = TTSRequestSchema.parse(body);

  if (!c.env.ELEVENLABS_API_KEY) {
    return c.json({ 
      error: "Configure a chave da ElevenLabs em Settings → Secrets" 
    }, 400);
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': c.env.ELEVENLABS_API_KEY,
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs error: ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();
    return c.body(audioBuffer, 200, {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'attachment; filename="narracao.mp3"',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro ao gerar narração';
    return c.json({ error: errorMsg }, 500);
  }
});

// Get diagnostic info
app.get("/api/projects/:id/diagnostic", authMiddleware, async (c) => {
  const user = c.get("user") as MochaUser;
  const id = c.req.param("id");

  const project = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE id = ? AND user_id = ?"
  )
    .bind(id, user.id)
    .first() as ProjectType | null;

  if (!project) {
    return c.json({ error: "Projeto não encontrado" }, 404);
  }

  const diagnostic: DiagnosticInfo = {
    provider_used: project.provider_used,
    secrets_status: {
      assemblyai: !!c.env.ASSEMBLYAI_API_KEY,
      openai: !!c.env.OPENAI_API_KEY,
      elevenlabs: !!c.env.ELEVENLABS_API_KEY,
      deepgram: !!c.env.DEEPGRAM_API_KEY,
    },
    file_info: {
      size: project.file_size,
      mime: project.file_mime,
      source: project.source_type,
    },
    last_error: project.last_error,
  };

  return c.json(diagnostic);
});

function formatTime(seconds: number, format: 'srt' | 'vtt'): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  const s = secs.toString().padStart(2, '0');
  const mil = ms.toString().padStart(3, '0');

  if (format === 'srt') {
    return `${h}:${m}:${s},${mil}`;
  } else {
    return `${h}:${m}:${s}.${mil}`;
  }
}

export default app;
