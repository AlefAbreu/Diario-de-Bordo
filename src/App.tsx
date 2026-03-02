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

const Toast = ({ message, type = 'success', onClose }: { message: string, type?: 'success' | 'error' | 'warning', onClose: () => void }) => {
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
          : type === 'warning'
          ? 'bg-amber-500/90 border-amber-400 text-white'
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

const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        toggleTheme();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { theme, toggleTheme };
};

const ThemeToggle = ({ theme, onToggle }: { theme: 'light' | 'dark', onToggle: () => void }) => {
  return (
    <button 
      onClick={onToggle}
      className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-90 group relative"
      title="Alternar Tema (Ctrl+J)"
    >
      <div className="relative w-5 h-5 overflow-hidden">
        <motion.div
          initial={false}
          animate={{ y: theme === 'dark' ? 0 : 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Sun size={20} />
        </motion.div>
        <motion.div
          initial={false}
          animate={{ y: theme === 'light' ? 0 : -30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Moon size={20} />
        </motion.div>
      </div>
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
        <p className="text-xs mt-2 opacity-60">Tente ajustar seus filtros ou adicione um novo registro.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pb-12 overflow-x-auto">
      <div className="min-w-[1100px]">
        <div className="grid grid-cols-[1.2fr_1fr_1.5fr_130px_130px_100px_80px] gap-4 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
          <div>Solicitante / Local</div>
          <div>Motivo / PN</div>
          <div>Ação Realizada</div>
          <div>Interação</div>
          <div>Agendamento / Conclusão</div>
          <div>Status</div>
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
                className={`grid grid-cols-[1.2fr_1fr_1.5fr_130px_130px_100px_80px] gap-4 items-center px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-none transition-all group cursor-pointer mt-2 ${isOverdue ? 'border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-1 h-6 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <div className="truncate">
                    <p className="text-sm font-bold truncate group-hover:text-emerald-600 transition-colors">{task.solicitante}</p>
                    <p className="text-[10px] text-zinc-400 font-medium truncate">{task.line}</p>
                  </div>
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-medium truncate">{task.reason}</p>
                  <p className="text-[10px] text-zinc-400 font-mono truncate">{task.pn || '-'}</p>
                </div>
                <div className="truncate">
                  <p className="text-[11px] text-zinc-500 line-clamp-2 leading-tight">{task.description || '-'}</p>
                </div>
                <div className="text-[10px] font-medium text-zinc-500 leading-tight">
                  {new Date(task.createdAt).toLocaleString('pt-BR').split(' ').map((p, i) => (
                    <div key={i}>{p}</div>
                  ))}
                </div>
                <div className={`text-[10px] font-bold leading-tight ${isOverdue ? 'text-red-500' : 'text-emerald-600'}`}>
                  {new Date(task.deadline).toLocaleString('pt-BR').split(' ').map((p, i) => (
                    <div key={i}>{p}</div>
                  ))}
                </div>
                <div>
                  <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-full ${
                    task.status === 'A Fazer' ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800' :
                    task.status === 'Em Andamento' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                  }`}>
                    {task.status}
                  </span>
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
    </div>
  );
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onDragStart }) => {
  const isOverdue = task.status !== 'Concluído' && new Date(task.deadline) < new Date();
  const [showToast, setShowToast] = useState(false);
  
  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `📋 *DETALHES DO ATENDIMENTO*\n` +
                  `━━━━━━━━━━━━━━━━━━━━━\n` +
                  `👤 *Solicitante:* ${task.solicitante}\n` +
                  `📍 *Local:* ${task.line}\n` +
                  `📦 *PN:* ${task.pn}\n` +
                  `❓ *Motivo:* ${task.reason}\n` +
                  `⏰ *Interação:* ${new Date(task.createdAt).toLocaleString('pt-BR')}\n` +
                  `⏳ *Status:* ${task.status}\n\n` +
                  `📝 *Ação:*\n${task.description}\n\n` +
                  `📅 *${task.status === 'Concluído' ? 'Conclusão' : 'Agendamento'}:* ${new Date(task.deadline).toLocaleString('pt-BR')}`;
    
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
        <div className={`absolute top-0 left-0 w-1 h-full ${isOverdue ? 'bg-red-500' : 'bg-emerald-500'}`} />

        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-wrap gap-1">
            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
              isOverdue ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
            }`}>
              {isOverdue ? 'Vencido' : 'Em Dia'}
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

        <h3 className="text-xs font-bold leading-tight mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
          {task.solicitante}
        </h3>
        <p className="text-[10px] font-medium text-zinc-400 mb-2 truncate">{task.line}</p>

        <div className="space-y-1.5 mb-2">
          <div className="flex items-center gap-2 text-zinc-500">
            <Clock size={10} className="shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-tighter text-zinc-400 font-black">Interação:</span>
              <span className="text-[9px] font-medium">
                {new Date(task.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <CheckCircle2 size={10} className="shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-tighter text-zinc-400 font-black">
                {task.status === 'Concluído' ? 'Conclusão:' : 'Agendamento:'}
              </span>
              <span className={`text-[9px] font-bold ${isOverdue ? 'text-red-500' : 'text-emerald-600'}`}>
                {new Date(task.deadline).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-1">
            <div className={`w-1 h-1 rounded-full animate-pulse ${isOverdue ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter">
              {task.status}
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
    solicitante: '',
    category: 'Receptivo/Inbound',
    line: '',
    pn: '',
    reason: '',
    description: '',
    createdAt: new Date().toISOString().slice(0, 16),
    deadline: new Date().toISOString().slice(0, 16),
    status: 'A Fazer'
  });

  const [isCustomLocal, setIsCustomLocal] = useState(false);

  const localOptions = [
    'LINHA LEVES',
    'LINHA PESADOS',
    'SEQUENCIAMENTO 88',
    'SEQUENCIAMENTO 89',
    'SEQUENCIAMENTO 90',
    'SEQUENCIAMENTO 81'
  ];
  
  useEffect(() => {
    if (task) {
      setFormData(task);
      setIsCustomLocal(!localOptions.includes(task.line));
    } else {
      setFormData({
        title: `Atendimento ${new Date().toLocaleString('pt-BR')}`,
        solicitante: '',
        category: 'Receptivo/Inbound',
        line: 'LINHA LEVES',
        pn: '',
        reason: '',
        description: '',
        createdAt: new Date().toISOString().slice(0, 16),
        deadline: new Date().toISOString().slice(0, 16),
        status: 'A Fazer'
      });
      setIsCustomLocal(false);
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
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-600/20">
                  <Plus size={20} />
                </div>
                <h2 className="text-lg font-black tracking-tight uppercase">
                  {task ? 'Editar Registro' : 'Novo Registro'}
                </h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <form onSubmit={(e) => {
                e.preventDefault();
                const updatedTask = {
                  ...formData,
                  createdAt: new Date().toISOString().slice(0, 16)
                };
                onSave(updatedTask as Task);
              }} className="space-y-6">
                
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Solicitante</label>
                  <input 
                    className="input-field"
                    required
                    value={formData.solicitante}
                    onChange={e => setFormData({...formData, solicitante: e.target.value})}
                    placeholder="Nome do solicitante"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Local</label>
                  <div className="space-y-2">
                    <select 
                      className="input-field appearance-none cursor-pointer"
                      value={isCustomLocal ? 'Outro' : formData.line}
                      onChange={e => {
                        if (e.target.value === 'Outro') {
                          setIsCustomLocal(true);
                          setFormData({...formData, line: ''});
                        } else {
                          setIsCustomLocal(false);
                          setFormData({...formData, line: e.target.value});
                        }
                      }}
                    >
                      {localOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                      <option value="Outro">Outro (Digitar manualmente)...</option>
                    </select>
                    
                    {isCustomLocal && (
                      <motion.input 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="input-field"
                        placeholder="Digite o local manualmente"
                        required
                        value={formData.line}
                        onChange={e => setFormData({...formData, line: e.target.value.toUpperCase()})}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Motivo</label>
                  <input 
                    className="input-field"
                    required
                    value={formData.reason}
                    onChange={e => setFormData({...formData, reason: e.target.value})}
                    placeholder="Motivo do chamado"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">PN</label>
                  <input 
                    className="input-field"
                    value={formData.pn}
                    onChange={e => setFormData({...formData, pn: e.target.value})}
                    placeholder="Part Number"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Ação</label>
                  <textarea 
                    className="input-field min-h-[100px] py-3 resize-none"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrição da ação realizada"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Status</label>
                  <select 
                    className="input-field appearance-none cursor-pointer"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})}
                  >
                    <option value="A Fazer">A Fazer</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">
                    {formData.status === 'Concluído' ? 'Data e Hora de Conclusão' : 'Data e Hora do Agendamento'}
                  </label>
                  <input 
                    type="datetime-local"
                    required
                    className="input-field text-sm"
                    value={formData.deadline}
                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
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
                    Salvar Registro
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
  const { theme, toggleTheme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'Todos'>('Todos');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);
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
        type: overdue.length > 0 ? 'error' : 'warning' 
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
      'Registro': t.title,
      'Solicitante': t.solicitante,
      'Local': t.line,
      'Motivo': t.reason,
      'PN': t.pn,
      'Ação': t.description,
      'Status': t.status,
      'Interação': new Date(t.createdAt).toLocaleString('pt-BR'),
      'Agendamento / Conclusão': new Date(t.deadline).toLocaleString('pt-BR')
    }));

    // Create worksheet
    const ws = utils.json_to_sheet(data);
    
    // Set column widths
    const wscols = [
      { wch: 5 },  // ID
      { wch: 30 }, // Registro
      { wch: 20 }, // Solicitante
      { wch: 20 }, // Local
      { wch: 20 }, // Motivo
      { wch: 15 }, // PN
      { wch: 40 }, // Ação
      { wch: 15 }, // Status
      { wch: 20 }, // Interação
      { wch: 25 }  // Agendamento / Conclusão
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

    if (startDate) {
      const taskDate = new Date(t.deadline).toISOString().split('T')[0];
      if (taskDate < startDate) return false;
    }

    if (endDate) {
      const taskDate = new Date(t.deadline).toISOString().split('T')[0];
      if (taskDate > endDate) return false;
    }

    return true;
  });

  const columns: TaskStatus[] = ['A Fazer', 'Em Andamento', 'Concluído'];
  const hasOverdue = upcomingDeadlines.some(t => new Date(t.deadline) <= new Date());

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
                className={`p-2.5 rounded-xl transition-all relative ${
                  upcomingDeadlines.length > 0 
                    ? (hasOverdue ? 'text-red-500 bg-red-50 dark:bg-red-900/20 shadow-sm' : 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-sm')
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title="Notificações de Prazo"
              >
                <Bell size={20} />
                {upcomingDeadlines.length > 0 && (
                  <span className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse ${hasOverdue ? 'bg-red-500' : 'bg-amber-500'}`} />
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
                            <div className={`p-2 rounded-xl ${hasOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'}`}>
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
                                    onClick={() => {
                                      setEditingTask(task);
                                      setIsModalOpen(true);
                                      setShowNotifications(false);
                                    }}
                                    className={`p-4 rounded-3xl transition-all border group cursor-pointer ${
                                      isOverdue 
                                        ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/50 hover:bg-red-100/50 dark:hover:bg-red-900/20' 
                                        : 'bg-amber-50/30 dark:bg-amber-900/5 border-amber-200/30 dark:border-amber-800/20 hover:bg-amber-100/30 dark:hover:bg-amber-900/10'
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
                                      <div 
                                        className="p-2 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Ver Detalhes"
                                      >
                                        <LayoutDashboard size={16} className="text-emerald-600" />
                                      </div>
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
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
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
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
              <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Conclusão:</span>
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
              {(startDate || endDate || filterStatus !== 'Todos') && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); setFilterStatus('Todos'); }}
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
