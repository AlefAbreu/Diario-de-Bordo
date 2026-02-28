import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Search, 
  Moon, 
  Sun, 
  Download, 
  Upload, 
  MoreVertical,
  ClipboardCheck,
  Clock,
  AlertCircle,
  Trash2,
  X,
  CheckCircle2,
  ArrowRight,
  Pencil,
  Bell,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { utils, writeFile } from 'xlsx';
import { dbService } from './db';
import { Task, TaskStatus, TaskCategory } from './types';

// --- Components ---

const Toast = ({ message, type = 'success', onClose }: { message: string, type?: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-md ${
        type === 'success' 
          ? 'bg-emerald-500/90 border-emerald-400 text-white' 
          : 'bg-red-500/90 border-red-400 text-white'
      }`}
    >
      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <span className="text-sm font-bold tracking-tight">{message}</span>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors">
        <X size={14} />
      </button>
    </motion.div>
  );
};

interface ComboBoxProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

const ComboBox = ({ label, value, options, onChange, placeholder }: ComboBoxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="relative">
      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">{label}</label>
      <div className="relative">
        <input 
          className="input-field"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
        />
        {isOpen && (filteredOptions.length > 0 || inputValue.length > 0) && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
            {filteredOptions.map((opt, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-4 py-3 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium"
                onClick={() => {
                  onChange(opt);
                  setInputValue(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </button>
            ))}
            {inputValue && !options.includes(inputValue) && (
              <div className="px-4 py-2 text-[10px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 italic">
                Nova opção: "{inputValue}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button 
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
      title="Alternar Tema"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void | Promise<void>;
  onDragStart: (e: React.DragEvent, id: number) => void;
}

const ListView: React.FC<{ 
  tasks: Task[], 
  onEdit: (task: Task) => void, 
  onDelete: (id: number) => void 
}> = ({ tasks, onEdit, onDelete }) => {
  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 border-2 border-dashed border-zinc-200 dark:border-zinc-800/50 rounded-[3rem] p-12 transition-colors duration-500 bg-white/30 dark:bg-zinc-900/30">
        <div className="mb-4 opacity-20">
          <ClipboardCheck size={64} />
        </div>
        <p className="text-sm font-black uppercase tracking-[0.3em]">Nenhum registro encontrado</p>
        <p className="text-xs mt-2 opacity-60">Tente ajustar seus filtros ou adicione um novo atendimento.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-12">
      <div className="grid grid-cols-[1fr_120px_120px_120px_100px_80px] gap-4 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
        <div>Atendimento / Cliente</div>
        <div className="hidden md:block">Linha</div>
        <div className="hidden lg:block">PN</div>
        <div>Status</div>
        <div>Prazo</div>
        <div className="text-right">Ações</div>
      </div>
      <AnimatePresence mode="popLayout">
        {tasks.map(task => {
          const isOverdue = task.status !== 'Concluído' && new Date(task.deadline) < new Date();
          return (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onDoubleClick={() => onEdit(task)}
              className={`grid grid-cols-[1fr_120px_120px_120px_100px_80px] gap-4 items-center px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-none transition-all group cursor-pointer ${isOverdue ? 'border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-1 h-6 rounded-full flex-shrink-0 ${
                  task.category === 'Receptivo/Inbound' ? 'bg-blue-500' :
                  task.category === 'Ativo/Outbound' ? 'bg-emerald-500' :
                  task.category === 'Acompanhamento/Follow-up' ? 'bg-amber-500' :
                  'bg-purple-500'
                }`} />
                <div className="truncate">
                  <p className="text-sm font-bold truncate group-hover:text-emerald-600 transition-colors">{task.title}</p>
                  <p className="text-[10px] text-zinc-400 font-medium truncate">{task.reason}</p>
                </div>
              </div>
              <div className="hidden md:block text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg text-center truncate">
                {task.line}
              </div>
              <div className="hidden lg:block text-[10px] font-mono font-bold text-zinc-500 truncate">
                {task.pn}
              </div>
              <div>
                <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-full ${
                  task.status === 'A Fazer' ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800' :
                  task.status === 'Em Andamento' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                  task.status === 'Aguardando' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' :
                  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                }`}>
                  {task.status}
                </span>
              </div>
              <div className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'text-zinc-500'}`}>
                {new Date(task.deadline).toLocaleDateString('pt-BR')}
              </div>
              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onEdit(task)}
                  className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 rounded-lg transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button 
                  onClick={() => onDelete(task.id!)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onDragStart }) => {
  const isOverdue = task.status !== 'Concluído' && new Date(task.deadline) < new Date();
  const [showToast, setShowToast] = useState(false);
  
  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `*Detalhes do Atendimento*\n` +
                 `👤 *Contato:* ${task.title}\n` +
                 `🔄 *Tipo:* ${task.category}\n` +
                 `🚛 *Linha:* ${task.line}\n` +
                 `📦 *PN:* ${task.pn}\n` +
                 `❓ *Motivo:* ${task.reason}\n` +
                 `⏰ *Data/Hora:* ${new Date(task.createdAt).toLocaleString('pt-BR')}\n` +
                 `⏳ *Status Atual:* ${task.status}\n\n` +
                 `📝 *Notas da Interação:*\n${task.description}\n\n` +
                 `📅 *Próximo Passo (Agendamento):* ${new Date(task.deadline).toLocaleString('pt-BR')}`;
    
    try {
      await navigator.clipboard.writeText(text);
      setShowToast(true);
    } catch (err) {
      console.error('Falha ao copiar', err);
    }
  };

  return (
    <>
      <motion.div
        layout
        draggable
        onDragStart={(e) => onDragStart(e, task.id!)}
        onDoubleClick={() => onEdit(task)}
        whileHover={{ y: -2, scale: 1.01 }}
        className={`task-card group relative overflow-hidden cursor-pointer p-3 ${isOverdue ? 'task-card-overdue' : ''}`}
      >
        <div className={`absolute top-0 left-0 w-1 h-full ${
          task.category === 'Receptivo/Inbound' ? 'bg-blue-500' :
          task.category === 'Ativo/Outbound' ? 'bg-emerald-500' :
          task.category === 'Acompanhamento/Follow-up' ? 'bg-amber-500' :
          'bg-purple-500'
        }`} />

        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-wrap gap-1">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
              {task.line.split(' ')[1] || task.line}
            </span>
            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
              task.category === 'Receptivo/Inbound' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
              task.category === 'Ativo/Outbound' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
              task.category === 'Acompanhamento/Follow-up' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
              'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
            }`}>
              {task.category.split('/')[0]}
            </span>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 rounded-md transition-colors"
              title="Editar"
            >
              <Pencil size={12} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(task.id!); }}
              className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded-md transition-colors"
              title="Excluir"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <h3 className="text-xs font-bold leading-tight mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
          {task.title}
        </h3>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="flex items-center gap-1 text-zinc-500">
            <ClipboardCheck size={10} className="shrink-0" />
            <span className="text-[9px] font-mono font-medium truncate">{task.pn}</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-500">
            <Clock size={10} className="shrink-0" />
            <span className={`text-[9px] font-bold ${isOverdue ? 'text-red-500' : ''}`}>
              {new Date(task.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-1">
            <div className={`w-1 h-1 rounded-full animate-pulse ${isOverdue ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter truncate max-w-[100px]">
              {task.reason}
            </span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); copyToClipboard(e); }}
            className="text-[10px] font-black text-emerald-600 hover:text-emerald-500 uppercase tracking-widest flex items-center gap-1"
          >
            Copiar
          </button>
        </div>
      </motion.div>
      <AnimatePresence>
        {showToast && (
          <Toast 
            message="Copiado para a área de transferência!" 
            onClose={() => setShowToast(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
};

interface ModalProps {
  task?: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

const TaskModal = ({ task, isOpen, onClose, onSave }: ModalProps) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    category: 'Receptivo/Inbound',
    line: '',
    pn: '',
    reason: '',
    description: '',
    createdAt: new Date().toISOString().slice(0, 16),
    deadline: new Date().toISOString().slice(0, 16),
    status: 'A Fazer'
  });

  // Hierarchical Options
  const lineOptions = ['Linha Leves', 'Linha Pesados', 'Linha Agrícola', 'Linha Utilitários'];
  const pnOptionsMap: Record<string, string[]> = {
    'Linha Leves': ['PN-1001 (Motor)', 'PN-1002 (Freio)', 'PN-1003 (Suspensão)'],
    'Linha Pesados': ['PN-2001 (Transmissão)', 'PN-2002 (Eixo)', 'PN-2003 (Diferencial)'],
    'Linha Agrícola': ['PN-3001 (Hidráulico)', 'PN-3002 (TDP)', 'PN-3003 (Implemento)'],
    'Linha Utilitários': ['PN-4001 (Chassi)', 'PN-4002 (Elétrica)']
  };
  const reasonOptions = ['Garantia', 'Dúvida Técnica', 'Reclamação', 'Instalação', 'Peça Faltante', 'Avaria no Transporte'];

  useEffect(() => {
    if (task) {
      setFormData(task);
    } else {
      setFormData({
        title: '',
        category: 'Receptivo/Inbound',
        line: '',
        pn: '',
        reason: '',
        description: '',
        createdAt: new Date().toISOString().slice(0, 16),
        deadline: new Date().toISOString().slice(0, 16),
        status: 'A Fazer'
      });
    }
  }, [task, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-600/20">
                  <Plus size={20} />
                </div>
                <h2 className="text-lg font-black tracking-tight uppercase">
                  {task ? 'Editar Registro' : 'Novo Atendimento'}
                </h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-8 custom-scrollbar">
              <form onSubmit={(e) => {
                e.preventDefault();
                onSave(formData as Task);
              }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Atendimento / Contato</label>
                  <input 
                    required
                    className="input-field text-base font-medium"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Nome do cliente, empresa ou protocolo"
                  />
                </div>

                <div className="space-y-6">
                  <ComboBox 
                    label="Linha de Produto"
                    value={formData.line || ''}
                    options={lineOptions}
                    onChange={(val) => setFormData({...formData, line: val, pn: ''})}
                    placeholder="Selecione ou digite a linha"
                  />

                  <ComboBox 
                    label="Part Number (PN)"
                    value={formData.pn || ''}
                    options={formData.line ? (pnOptionsMap[formData.line] || []) : []}
                    onChange={(val) => setFormData({...formData, pn: val})}
                    placeholder="Selecione ou digite o PN"
                  />

                  <ComboBox 
                    label="Motivo do Chamado"
                    value={formData.reason || ''}
                    options={reasonOptions}
                    onChange={(val) => setFormData({...formData, reason: val})}
                    placeholder="Qual o motivo do contato?"
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Tipo de Interação</label>
                    <select 
                      className="input-field appearance-none cursor-pointer"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value as TaskCategory})}
                    >
                      <option value="Receptivo/Inbound">Receptivo/Inbound</option>
                      <option value="Ativo/Outbound">Ativo/Outbound</option>
                      <option value="Acompanhamento/Follow-up">Acompanhamento/Follow-up</option>
                      <option value="Processamento Back-office">Back-office</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Status do Fluxo</label>
                    <select 
                      className="input-field appearance-none cursor-pointer"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})}
                    >
                      <option value="A Fazer">A Fazer</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Aguardando">Aguardando Resposta</option>
                      <option value="Concluído">Concluído / Documentado</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Início</label>
                      <input 
                        type="datetime-local"
                        className="input-field text-xs"
                        value={formData.createdAt}
                        onChange={e => setFormData({...formData, createdAt: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Prazo</label>
                      <input 
                        type="datetime-local"
                        className="input-field text-xs"
                        value={formData.deadline}
                        onChange={e => setFormData({...formData, deadline: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Observações / Detalhamento</label>
                  <textarea 
                    className="input-field min-h-[120px] resize-none"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva o que foi tratado..."
                  />
                </div>

                <div className="md:col-span-2 flex gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button 
                    type="button"
                    onClick={onClose}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="btn-primary flex-[2]"
                  >
                    Finalizar Registro
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Main App ---

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'Todos'>('Todos');
  const [filterLine, setFilterLine] = useState('Todas');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<TaskStatus | null>(null);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Task[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const init = async () => {
      await dbService.init();
      loadTasks();
    };
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      checkUpcomingDeadlines(tasks);
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showNotifications && !(e.target as Element).closest('.notifications-container')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const loadTasks = async () => {
    const all = await dbService.getAllTasks();
    setTasks(all);
    setIsLoading(false);
    checkUpcomingDeadlines(all);
  };

  const checkUpcomingDeadlines = (allTasks: Task[]) => {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const overdue = allTasks.filter(t => {
      if (t.status === 'Concluído') return false;
      const deadline = new Date(t.deadline);
      return deadline <= now;
    });

    const upcoming = allTasks.filter(t => {
      if (t.status === 'Concluído') return false;
      const deadline = new Date(t.deadline);
      return deadline > now && deadline <= next24h;
    });

    setUpcomingDeadlines([...overdue, ...upcoming]);
    
    if (overdue.length > 0 || upcoming.length > 0) {
      const message = overdue.length > 0 
        ? `Você tem ${overdue.length} tarefa(s) VENCIDAS e ${upcoming.length} próximas do prazo!`
        : `Você tem ${upcoming.length} tarefa(s) com prazo próximo!`;
      
      setToast({ 
        message, 
        type: 'error' 
      });
    }
  };

  const handleSaveTask = async (task: Task) => {
    try {
      if (task.id) {
        await dbService.updateTask(task);
        setToast({ message: 'Registro atualizado com sucesso!', type: 'success' });
      } else {
        await dbService.addTask(task);
        setToast({ message: 'Novo registro salvo com sucesso!', type: 'success' });
      }
      loadTasks();
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      setToast({ message: 'Erro ao salvar registro.', type: 'error' });
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (confirm('Deseja realmente excluir este registro?')) {
      try {
        await dbService.deleteTask(id);
        setToast({ message: 'Registro excluído.', type: 'success' });
        loadTasks();
      } catch (err) {
        setToast({ message: 'Erro ao excluir registro.', type: 'error' });
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', id.toString());
    e.dataTransfer.setData('text', id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const idStr = e.dataTransfer.getData('text') || e.dataTransfer.getData('text/plain');
    const id = parseInt(idStr);
    
    if (isNaN(id)) return;

    const task = tasks.find(t => t.id === id);
    if (task && task.status !== status) {
      try {
        const updatedTask = { ...task, status };
        await dbService.updateTask(updatedTask);
        setToast({ message: `Status alterado para: ${status}`, type: 'success' });
        loadTasks();
      } catch (err) {
        setToast({ message: 'Erro ao atualizar status.', type: 'error' });
      }
    }
  };

  const exportToExcel = async () => {
    const all = await dbService.getAllTasks();
    if (all.length === 0) {
      setToast({ message: 'Não há dados para exportar.', type: 'error' });
      return;
    }

    // Prepare data for SheetJS
    const data = all.map(t => ({
      'ID': t.id,
      'Título': t.title,
      'Descrição': t.description?.replace(/[\n\r]+/g, ' ').trim(),
      'Status': t.status,
      'Categoria': t.category,
      'Linha': t.line,
      'PN': t.pn,
      'Motivo': t.reason,
      'Data de Criação': new Date(t.createdAt).toLocaleString('pt-BR'),
      'Prazo': t.deadline ? new Date(t.deadline).toLocaleString('pt-BR') : ''
    }));

    // Create worksheet
    const ws = utils.json_to_sheet(data);
    
    // Set column widths for better "tabulation"
    const wscols = [
      { wch: 5 },  // ID
      { wch: 30 }, // Título
      { wch: 50 }, // Descrição
      { wch: 15 }, // Status
      { wch: 15 }, // Categoria
      { wch: 10 }, // Linha
      { wch: 15 }, // PN
      { wch: 20 }, // Motivo
      { wch: 20 }, // Data Criação
      { wch: 20 }, // Prazo
    ];
    ws['!cols'] = wscols;

    // Create workbook and append worksheet
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Diário de Bordo');

    // Export file
    writeFile(wb, `diario-de-bordo-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    setToast({ message: 'Exportado para Excel (.xlsx) com sucesso!', type: 'success' });
  };

  const exportBackup = async () => {
    const all = await dbService.getAllTasks();
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diario-de-bordo-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: 'Backup JSON gerado com sucesso!', type: 'success' });
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          if (confirm('Isso substituirá seus dados atuais. Continuar?')) {
            await dbService.clearAll();
            for (const task of data) {
              delete task.id; // Let IndexedDB auto-increment
              await dbService.addTask(task);
            }
            loadTasks();
            setToast({ message: 'Dados importados com sucesso!', type: 'success' });
          }
        }
      } catch (err) {
        setToast({ message: 'Erro ao importar arquivo JSON.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                         t.description.toLowerCase().includes(search.toLowerCase()) ||
                         t.pn.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterStatus !== 'Todos' && t.status !== filterStatus) return false;
    if (filterLine !== 'Todas' && t.line !== filterLine) return false;

    if (startDate) {
      const taskDate = new Date(t.createdAt).toISOString().split('T')[0];
      if (taskDate < startDate) return false;
    }

    if (endDate) {
      const taskDate = new Date(t.createdAt).toISOString().split('T')[0];
      if (taskDate > endDate) return false;
    }

    return true;
  });

  const columns: TaskStatus[] = ['A Fazer', 'Em Andamento', 'Aguardando', 'Concluído'];

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-pulse text-zinc-400 font-medium">Carregando Diário de Bordo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel shadow-sm border-b border-zinc-200/50 dark:border-zinc-800/50">
        {/* Top Bar: Logo, Search, Primary Actions */}
        <div className="px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-4 shrink-0">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-600/20 rotate-3 hover:rotate-0 transition-transform duration-500">
              <LayoutDashboard size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none bg-gradient-to-br from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">DIÁRIO DE BORDO</h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-bold mt-0.5">Gestão Local</p>
            </div>
          </div>

          <div className="flex-1 max-w-2xl w-full">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                className="w-full bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-all shadow-inner"
                placeholder="Pesquisar registros, clientes ou PNs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative notifications-container">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2.5 rounded-xl transition-all relative ${upcomingDeadlines.length > 0 ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-sm' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                title="Notificações de Prazo"
              >
                <Bell size={20} />
                {upcomingDeadlines.length > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowNotifications(false)}
                      className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[100]"
                    />
                    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[101] p-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden pointer-events-auto"
                      >
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                              <Bell size={20} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Notificações de Prazo</h3>
                          </div>
                          <button 
                            onClick={() => setShowNotifications(false)}
                            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        
                        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                          {upcomingDeadlines.length === 0 ? (
                            <div className="py-12 text-center">
                              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bell size={28} className="text-zinc-300" />
                              </div>
                              <p className="text-zinc-500 text-sm font-medium">Nenhum prazo crítico ou vencido.</p>
                              <p className="text-zinc-400 text-xs mt-1">Bom trabalho! Suas tarefas estão em dia.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2 mb-2">Prazos Críticos e Vencidos</p>
                              {upcomingDeadlines.map(task => {
                                const isOverdue = new Date(task.deadline) <= new Date();
                                return (
                                  <div 
                                    key={task.id} 
                                    className={`p-4 rounded-3xl transition-all border group ${
                                      isOverdue 
                                        ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/50 hover:bg-red-100/50 dark:hover:bg-red-900/20' 
                                        : 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200/50 dark:border-zinc-700/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start gap-3">
                                      <div className="flex-1">
                                        <p className="text-sm font-bold group-hover:text-emerald-600 transition-colors">{task.title}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                            isOverdue 
                                              ? 'text-red-600 bg-red-100 dark:bg-red-900/30' 
                                              : 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
                                          }`}>
                                            {isOverdue ? 'Vencido' : 'Próximo'}
                                          </span>
                                          <div className="flex items-center gap-1.5 text-zinc-500">
                                            <Clock size={12} />
                                            <p className="text-[11px] font-medium">
                                              {new Date(task.deadline).toLocaleString('pt-BR')}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <button 
                                        onClick={() => {
                                          setEditingTask(task);
                                          setIsModalOpen(true);
                                          setShowNotifications(false);
                                        }}
                                        className="p-2 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Ver Detalhes"
                                      >
                                        <LayoutDashboard size={16} className="text-emerald-600" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 text-center">
                          <button 
                            onClick={() => setShowNotifications(false)}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                          >
                            Fechar Notificações
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <ThemeToggle />
            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
            <button 
              onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 font-bold text-[10px] uppercase tracking-widest active:scale-95"
            >
              <Plus size={16} />
              <span>Novo</span>
            </button>
          </div>
        </div>

        {/* Sub Header: Filters & View Toggles */}
        <div className="px-6 py-2 flex flex-wrap items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
              <select 
                className="bg-transparent border-none text-[10px] font-black uppercase outline-none cursor-pointer text-zinc-500 dark:text-zinc-400 tracking-widest px-2 py-1"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
              >
                <option value="Todos">Status: Todos</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />
              <select 
                className="bg-transparent border-none text-[10px] font-black uppercase outline-none cursor-pointer text-zinc-500 dark:text-zinc-400 tracking-widest px-2 py-1"
                value={filterLine}
                onChange={e => setFilterLine(e.target.value)}
              >
                <option value="Todas">Linha: Todas</option>
                {['Linha Leves', 'Linha Pesados', 'Linha Agrícola', 'Linha Utilitários'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
              <div className="flex items-center gap-2 px-2">
                <Clock size={12} className="text-zinc-400" />
                <input 
                  type="date"
                  className="bg-transparent border-none text-[10px] font-bold uppercase outline-none cursor-pointer text-zinc-600 dark:text-zinc-300"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="text-zinc-300 dark:text-zinc-700 font-light">/</div>
              <div className="flex items-center gap-2 px-2">
                <input 
                  type="date"
                  className="bg-transparent border-none text-[10px] font-bold uppercase outline-none cursor-pointer text-zinc-600 dark:text-zinc-300"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
              {(startDate || endDate || filterStatus !== 'Todos' || filterLine !== 'Todas') && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); setFilterStatus('Todos'); setFilterLine('Todas'); }}
                  className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-xl shadow-inner">
              <button 
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-zinc-800 text-emerald-600 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                title="Visualização Kanban"
              >
                <LayoutDashboard size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 text-emerald-600 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                title="Visualização em Lista"
              >
                <List size={16} />
              </button>
            </div>

            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />

            <div className="flex items-center gap-1">
              <button 
                onClick={exportToExcel}
                className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-emerald-600"
                title="Exportar Excel"
              >
                <Download size={18} />
              </button>
              <button 
                onClick={exportBackup}
                className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-400"
                title="Backup JSON"
              >
                <ClipboardCheck size={18} />
              </button>
              <label className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer" title="Importar JSON">
                <Upload size={18} />
                <input type="file" accept=".json" className="hidden" onChange={importData} />
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-x-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:24px_24px]">
        <AnimatePresence mode="wait">
          {viewMode === 'kanban' ? (
            <motion.div 
              key="kanban"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex gap-6 min-w-max h-full"
            >
              {columns.map(status => (
                <div 
                  key={status} 
                  className="w-[280px] md:flex-1 flex flex-col gap-4"
                  onDragOver={e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDraggedOverColumn(status);
                  }}
                  onDragLeave={() => setDraggedOverColumn(null)}
                  onDrop={e => {
                    setDraggedOverColumn(null);
                    handleDrop(e, status);
                  }}
                >
                  <div className="flex items-center justify-between px-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-6 rounded-full ${
                        status === 'A Fazer' ? 'bg-zinc-400' :
                        status === 'Em Andamento' ? 'bg-blue-500' :
                        status === 'Aguardando' ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`} />
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{status}</h2>
                      <span className="bg-zinc-200 dark:bg-zinc-800 text-[10px] font-black px-2 py-0.5 rounded-full text-zinc-500">
                        {filteredTasks.filter(t => t.status === status).length}
                      </span>
                    </div>
                  </div>

                  <div className={`kanban-column flex-1 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar ${
                    draggedOverColumn === status 
                      ? 'ring-2 ring-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-900/10 border-emerald-500/30' 
                      : ''
                  }`}>
                    <AnimatePresence mode="popLayout">
                      {filteredTasks
                        .filter(t => t.status === status)
                        .map(task => (
                          <TaskCard 
                            key={task.id} 
                            task={task} 
                            onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                            onDelete={handleDeleteTask}
                            onDragStart={handleDragStart}
                          />
                        ))}
                    </AnimatePresence>
                    
                    {filteredTasks.filter(t => t.status === status).length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 border-2 border-dashed border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-8 transition-colors duration-500">
                        <div className="mb-3 opacity-20">
                          {status === 'Concluído' ? <CheckCircle2 size={40} /> : <ArrowRight size={40} />}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Vazio</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto h-full flex flex-col"
            >
              <ListView 
                tasks={filteredTasks} 
                onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                onDelete={handleDeleteTask}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Stats */}
      <footer className="p-4 glass-panel border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-zinc-500">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Total: {tasks.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Pendentes: {tasks.filter(t => t.status !== 'Concluído').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Vencidos: {tasks.filter(t => t.status !== 'Concluído' && new Date(t.deadline) < new Date()).length}</span>
          </div>
        </div>
        <div>
          <span>Local Storage: IndexedDB</span>
        </div>
      </footer>

      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        task={editingTask}
        onSave={handleSaveTask}
      />

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
