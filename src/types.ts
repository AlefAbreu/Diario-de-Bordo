export type TaskStatus = 'A Fazer' | 'Em Andamento' | 'Aguardando' | 'Concluído';
export type TaskCategory = 'Receptivo/Inbound' | 'Ativo/Outbound' | 'Acompanhamento/Follow-up' | 'Processamento Back-office';

export interface Task {
  id?: number;
  title: string;
  category: TaskCategory;
  line: string;
  pn: string;
  reason: string;
  description: string;
  createdAt: string;
  deadline: string;
  status: TaskStatus;
}
