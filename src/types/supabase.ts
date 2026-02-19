export type Workspace = {
  id: string;
  name: string;
  slug: string;
  user_id: string;
};



export type TaskHistory = {
  id: string;
  task_id: string; // Foreign Key to documents.id or idea_pipeline.id
  task_type: 'document' | 'idea';
  previous_status: string;
  new_status: string;
  changed_by: string; // User ID or 'Agent'
  changed_at: string;
  details?: string;
  workspace_id: string;
};

export type ApiKey = {
  id: string;
  key_hash: string;
  label: string;
  workspace_id?: string;
  created_at: string;
};

// Extend existing types
export type Idea = {
  id: string;
  title: string;
  description: string;
  priority_score: number; // 1-10
  progress_pct: number; // 0-100%
  status: 'draft' | 'evaluating' | 'prioritized' | 'executed' | 'discarded';
  source_url?: string;
  ai_analysis?: string;
  estimated_effort?: number; // 1-5
  created_by_type?: 'manual' | 'agent';
  start_date?: string; // ISO Date
  due_date?: string; // ISO Date
  idea_number?: number; // Serial ID
  workspace_id: string;
};

export type Document = {
  id: string;
  title: string;
  content: string; // Markdown
  category: 'Investigación' | 'En Progreso' | 'Finalizado';
  workspace_id: string;
  tags?: string[];
  subject?: string;
  priority_score?: number;
  metadata?: {
    tokens?: number;
    model?: string;
    due_date?: string; // ISO Date for Calendar View
  };
  is_archived?: boolean;
  parent_id?: string | null;
  start_date?: string | null; // ISO Date
  due_date?: string | null; // ISO Date
  color?: string; // Hex or Tailwind class
  created_by_type?: 'manual' | 'agent';
  user_id?: string;
  created_at?: string; // ISO Date
};

export type ProcessTemplate = {
  id: string;
  name: string;
  description?: string;
  steps: Array<{
    title: string;
    category: Document['category'];
    description?: string;
    estimated_effort?: number;
    delay_days?: number; // For due_date calculation
  }>;
  created_at?: string;
};

// Phase 2: Hierarchy & Versioning
export type DocumentVersion = {
  id: string;
  document_id: string;
  content: string;
  version_number: number;
  created_at: string;
  created_by: string;
};

export type AttachmentMap = {
  id: string;
  source_id: string;
  target_id: string;
  target_version_id?: string;
  type: 'reference' | 'output';
  created_at: string;
};

// Unified Kanban Item
export type KanbanItem = {
  id: string;
  title: string;
  status: string; // documents.category OR idea.status
  type: 'document' | 'idea';
  priority: number;
  workspace_id: string;
  // Polymorphic fields
  description?: string; // Idea has description, Document has content (we might use excerpt)
  external_url?: string;
  doc_type?: 'markdown' | 'link'; // Specific to Document
  parent_id?: string; // Specific to Document (Task/Project)
  start_date?: string;
  due_date?: string;
  tags?: string[];
  original_data: Document | Idea; // Keep reference to original object for updates
};
