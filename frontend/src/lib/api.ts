const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface Subject {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  semester?: string | null;
  created_at: string;
  updated_at: string;
  unit_count: number;
  resource_count: number;
}

export interface SyllabusUnit {
  id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  description?: string | null;
  created_at: string;
}

export type SourceType =
  | "syllabus"
  | "textbook"
  | "notes"
  | "question_paper"
  | "other";

export type ProcessingStatus =
  | "pending"
  | "uploaded"
  | "processing"
  | "ready"
  | "failed";

export interface AcademicResource {
  id: string;
  subject_id: string;
  unit_id?: string | null;
  title: string;
  source_type: SourceType;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  storage_path?: string | null;
  status: ProcessingStatus;
  page_count: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentPage {
  id: string;
  resource_id: string;
  page_number: number;
  content: string;
  char_count: number;
  created_at: string;
}

export interface DocumentPagesList {
  resource_id: string;
  title: string;
  file_name: string;
  page_count: number;
  status: ProcessingStatus;
  error_message?: string | null;
  pages: DocumentPage[];
}

export type AnswerMode = "source_only" | "combine_sources" | "general";

export type AnswerFormat =
  | "detailed"
  | "short"
  | "2_mark"
  | "5_mark"
  | "10_mark"
  | "step_by_step";

export interface RetrievedCitation {
  chunk_id: string;
  resource_id: string;
  document_title: string;
  file_name: string;
  source_type: SourceType;
  unit_id?: string | null;
  page_number: number;
  excerpt: string;
  score: number;
  verified?: boolean;
}

export interface CitationVerificationResult {
  valid: boolean;
  subject_match: boolean;
  resource_exists: boolean;
  page_exists: boolean;
  resource_title?: string | null;
  file_name?: string | null;
  source_type?: SourceType | null;
  page_number?: number | null;
  page_char_count?: number | null;
  surrounding_context?: string | null;
  message: string;
}

export interface RAGQueryRequest {
  query: string;
  subject_id: string;
  unit_id?: string | null;
  mode: AnswerMode;
  answer_format: AnswerFormat;
  source_types?: SourceType[];
}

export interface RAGQueryResponse {
  answer: string;
  grounded: boolean;
  mode_used: AnswerMode;
  format_used: AnswerFormat;
  citations: RetrievedCitation[];
  retrieved_count: number;
  disclaimer?: string | null;
  timestamp: string;
}

export async function fetchSubjects(): Promise<Subject[]> {
  const res = await fetch(`${API_BASE_URL}/subjects`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch subjects: ${res.statusText}`);
  }
  return res.json();
}

export async function createSubject(data: {
  name: string;
  code?: string;
  description?: string;
  semester?: string;
}): Promise<Subject> {
  const res = await fetch(`${API_BASE_URL}/subjects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create subject");
  }
  return res.json();
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete subject");
  }
}

export async function fetchUnits(subjectId: string): Promise<SyllabusUnit[]> {
  const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}/units`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch syllabus units");
  }
  return res.json();
}

export async function createUnit(
  subjectId: string,
  data: {
    unit_number: number;
    title: string;
    description?: string;
  }
): Promise<SyllabusUnit> {
  const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}/units`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create syllabus unit");
  }
  return res.json();
}

export async function deleteUnit(unitId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/units/${unitId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete unit");
  }
}

export async function fetchResources(params?: {
  subject_id?: string;
  unit_id?: string;
  source_type?: SourceType;
}): Promise<AcademicResource[]> {
  const query = new URLSearchParams();
  if (params?.subject_id) query.append("subject_id", params.subject_id);
  if (params?.unit_id) query.append("unit_id", params.unit_id);
  if (params?.source_type) query.append("source_type", params.source_type);

  const url = `${API_BASE_URL}/resources${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch academic resources");
  }
  return res.json();
}

export async function createResource(data: {
  subject_id: string;
  unit_id?: string | null;
  title: string;
  source_type: SourceType;
  file_name: string;
  file_type: string;
  file_size_bytes?: number;
}): Promise<AcademicResource> {
  const res = await fetch(`${API_BASE_URL}/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create academic resource record");
  }
  return res.json();
}

export async function deleteResource(resourceId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/resources/${resourceId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete academic resource");
  }
}

export async function uploadAcademicFile(
  subjectId: string,
  formData: FormData
): Promise<AcademicResource> {
  const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to upload and extract document");
  }
  return res.json();
}

export async function fetchDocumentPages(
  resourceId: string
): Promise<DocumentPagesList> {
  const res = await fetch(`${API_BASE_URL}/resources/${resourceId}/pages`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch extracted document pages");
  }
  return res.json();
}

export function getDownloadUrl(resourceId: string): string {
  return `${API_BASE_URL}/resources/${resourceId}/download`;
}

export async function queryAcademicRAG(
  req: RAGQueryRequest
): Promise<RAGQueryResponse> {
  const res = await fetch(`${API_BASE_URL}/rag/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to query academic knowledge assistant");
  }
  return res.json();
}

export async function verifyCitation(params: {
  subject_id: string;
  resource_id: string;
  chunk_id: string;
  page_number: number;
}): Promise<CitationVerificationResult> {
  const res = await fetch(`${API_BASE_URL}/rag/verify-citation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to verify citation");
  }
  return res.json();
}


