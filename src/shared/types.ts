import z from "zod";

// Project schemas
export const ProjectSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  title: z.string(),
  source_type: z.enum(['upload', 'url']),
  source_url: z.string().nullable(),
  file_key: z.string().nullable(),
  file_name: z.string().nullable(),
  file_size: z.number().nullable(),
  file_mime: z.string().nullable(),
  transcript_text: z.string().nullable(),
  transcript_id: z.string().nullable(),
  provider_used: z.enum(['assemblyai', 'openai', 'deepgram', 'failed']).nullable(),
  last_error: z.string().nullable(),
  media_info: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ProjectType = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  source_type: z.enum(['upload', 'url']),
  source_url: z.string().url().optional(),
});

export const TranscribeRequestSchema = z.object({
  project_id: z.number(),
});

export const TTSRequestSchema = z.object({
  text: z.string().min(1),
  voice_id: z.string(),
});

export interface DiagnosticInfo {
  provider_used: string | null;
  secrets_status: {
    assemblyai: boolean;
    openai: boolean;
    elevenlabs: boolean;
    deepgram: boolean;
  };
  file_info: {
    size: number | null;
    mime: string | null;
    source: string | null;
  };
  last_error: string | null;
}
