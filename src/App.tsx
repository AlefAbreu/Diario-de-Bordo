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
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { utils, writeFile } from 'xlsx';
import { dbService } from './db';
import { Task, TaskStatus, TaskCategory } from './types';

// --- Components ---

const Toast = ({ message, type = 'success', onClose }: { message: string, type?: 'success' | 'error' | 'warning', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed bottom-10 right-10 z-[100] flex items-center gap-5 px-8 py-5 rounded-[2.5rem] shadow-premium border backdrop-blur-3xl transition-all duration-700 ${
        type === 'success' 
          ? 'bg-zinc-900/95 dark:bg-white/95 border-zinc-800 dark:border-zinc-200 text-white dark:text-zinc-900' 
          : type === 'warning'
          ? 'bg-amber-500/95 border-amber-400 text-white'
          : 'bg-red-500/95 border-red-400 text-white'
      }`}
    >
      <div className={`p-2 rounded-full ${
        type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/20 text-white'
      }`}>
        {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{message}</span>
      <button onClick={onClose} className="ml-4 p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-all">
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

const ListView: React.FC<{ 
  tasks: Task[], 
  onEdit: (task: Task) => void, 
  onDelete: (id: number) => void,
  onToggleComplete: (task: Task) => void
}> = ({ tasks, onEdit, onDelete, onToggleComplete }) => {
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
    <div className="flex flex-col gap-3 pb-12 overflow-x-hidden md:overflow-x-auto custom-scrollbar">
      <div className="w-full md:min-w-[1100px]">
        {/* Desktop Header */}
        <div className="hidden md:grid grid-cols-[40px_1.2fr_1fr_1.5fr_130px_130px_100px_80px] gap-4 px-8 py-4 premium-label border-b border-zinc-200/50 dark:border-zinc-800/50">
          <div></div>
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
            const isCompleted = task.status === 'Concluído';
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onDoubleClick={() => onEdit(task)}
                className={`flex flex-col md:grid md:grid-cols-[40px_1.2fr_1fr_1.5fr_130px_130px_100px_80px] gap-4 md:gap-6 items-start md:items-center px-4 py-4 md:px-10 md:py-6 bg-white dark:bg-[#111113] border border-zinc-200/40 dark:border-zinc-800/40 rounded-[1.5rem] md:rounded-[2rem] hover:shadow-premium hover:border-emerald-500/30 transition-all duration-700 group cursor-pointer mt-3 md:mt-4 ${isOverdue ? 'task-card-overdue' : ''} ${isCompleted ? 'opacity-60 hover:opacity-100' : ''}`}
              >
                {/* Mobile Header & Checkbox */}
                <div className="flex items-center justify-between w-full md:w-auto md:justify-center">
                  <div className="flex items-center gap-3 md:gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-500 flex-shrink-0 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-glow' : 'border-zinc-300 dark:border-zinc-700 text-transparent hover:border-emerald-500'}`}
                    >
                      <Check size={14} className={isCompleted ? 'opacity-100' : 'opacity-0'} strokeWidth={3} />
                    </button>
                    <div className="md:hidden">
                      <p className={`text-sm font-bold truncate transition-colors duration-700 ${isCompleted ? 'line-through text-zinc-400 dark:text-zinc-600' : 'text-zinc-800 dark:text-zinc-100'}`}>{task.solicitante}</p>
                      <p className="premium-label truncate mt-0.5">{task.line}</p>
                    </div>
                  </div>
                  <div className="md:hidden">
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full border transition-all duration-700 ${
                      task.status === 'A Fazer' ? 'bg-zinc-50 text-zinc-400 border-zinc-200/50 dark:bg-zinc-900/50 dark:border-zinc-800/50' :
                      task.status === 'Em Andamento' ? 'bg-blue-500/5 text-blue-500 border-blue-500/20 dark:bg-blue-900/10 dark:border-blue-800/20' :
                      'bg-emerald-500/5 text-emerald-600 border-emerald-500/20 dark:bg-emerald-900/10 dark:border-emerald-800/20'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>

                {/* Desktop Solicitante / Local */}
                <div className="hidden md:flex items-center gap-5 min-w-0">
                  <div className={`w-1.5 h-10 rounded-full flex-shrink-0 transition-all duration-700 ${isOverdue ? 'bg-red-500/30 shadow-glow' : isCompleted ? 'bg-emerald-500/30' : 'bg-blue-500/30'}`} />
                  <div className="truncate">
                    <p className={`text-sm font-bold truncate transition-colors duration-700 ${isCompleted ? 'line-through text-zinc-400 dark:text-zinc-600' : 'group-hover:text-emerald-600'}`}>{task.solicitante}</p>
                    <p className="premium-label truncate mt-1">{task.line}</p>
                  </div>
                </div>

                {/* Motivo / PN */}
                <div className="w-full md:w-auto truncate">
                  <p className={`text-[11px] font-bold truncate transition-colors duration-700 ${isCompleted ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-700 dark:text-zinc-200'}`}>
                    <span className="md:hidden text-zinc-400 mr-1 font-normal">Motivo:</span>{task.reason}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono tracking-tighter truncate mt-0.5">
                    <span className="md:hidden text-zinc-400 mr-1 font-normal">PN:</span>{task.pn || '-'}
                  </p>
                </div>

                {/* Descrição */}
                <div className="w-full md:w-auto">
                  <p className={`text-[11px] line-clamp-2 leading-relaxed font-medium transition-colors duration-700 ${isCompleted ? 'text-zinc-400/50 dark:text-zinc-600/50' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    <span className="md:hidden text-zinc-400 mr-1 font-normal block mb-1">Ação:</span>{task.description || '-'}
                  </p>
                </div>

                {/* Datas */}
                <div className="flex justify-between w-full md:contents mt-2 md:mt-0 pt-3 md:pt-0 border-t border-zinc-100 dark:border-zinc-800/50 md:border-none">
                  <div className="text-[10px] font-bold text-zinc-400 tracking-tight leading-tight">
                    <span className="md:hidden block mb-1 uppercase tracking-widest opacity-60">Interação</span>
                    {new Date(task.createdAt).toLocaleString('pt-BR').split(' ').map((p, i) => (
                      <span key={i} className="mr-1 md:mr-0 md:block">{p}</span>
                    ))}
                  </div>
                  <div className={`text-[10px] font-black leading-tight tracking-tight text-right md:text-left ${isOverdue ? 'text-red-500/80' : isCompleted ? 'text-emerald-600/50' : 'text-emerald-600/80'}`}>
                    <span className="md:hidden block mb-1 uppercase tracking-widest opacity-60 text-zinc-400">Prazo</span>
                    {new Date(task.deadline).toLocaleString('pt-BR').split(' ').map((p, i) => (
                      <span key={i} className="mr-1 md:mr-0 md:block">{p}</span>
                    ))}
                  </div>
                </div>

                {/* Status Desktop */}
                <div className="hidden md:block">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border transition-all duration-700 ${
                    task.status === 'A Fazer' ? 'bg-zinc-50 text-zinc-400 border-zinc-200/50 dark:bg-zinc-900/50 dark:border-zinc-800/50' :
                    task.status === 'Em Andamento' ? 'bg-blue-500/5 text-blue-500 border-blue-500/20 dark:bg-blue-900/10 dark:border-blue-800/20' :
                    'bg-emerald-500/5 text-emerald-600 border-emerald-500/20 dark:bg-emerald-900/10 dark:border-emerald-800/20'
                  }`}>
                    {task.status}
                  </span>
                </div>

                {/* Ações */}
                <div className="flex justify-end gap-2 w-full md:w-auto md:opacity-0 group-hover:opacity-100 transition-all duration-700 md:transform md:translate-x-4 group-hover:translate-x-0 mt-2 md:mt-0 pt-4 md:pt-0 border-t border-zinc-100 dark:border-zinc-800/50 md:border-none">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                    className="flex-1 md:flex-none flex justify-center items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 hover:bg-white dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-600 rounded-2xl shadow-soft border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/50 transition-all"
                  >
                    <Pencil size={14} />
                    <span className="md:hidden text-[10px] font-bold uppercase tracking-widest">Editar</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(task.id!); }}
                    className="flex-1 md:flex-none flex justify-center items-center gap-2 p-3 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 rounded-2xl shadow-soft border border-transparent hover:border-red-200/50 dark:hover:border-red-800/50 transition-all"
                  >
                    <Trash2 size={14} />
                    <span className="md:hidden text-[10px] font-bold uppercase tracking-widest">Excluir</span>
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-[#0c0c0e] rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-8 border-b border-zinc-100 dark:border-zinc-800/50 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="bg-zinc-900 dark:bg-white p-2.5 rounded-2xl text-white dark:text-zinc-900 shadow-lg shadow-black/5 dark:shadow-white/5">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                    {task ? 'Editar Registro' : 'Novo Registro'}
                  </h2>
                  <p className="premium-label">Preencha os detalhes abaixo</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <form onSubmit={(e) => {
                e.preventDefault();
                const updatedTask = {
                  ...formData,
                  createdAt: task ? formData.createdAt : new Date().toISOString().slice(0, 16)
                };
                onSave(updatedTask as Task);
              }} className="space-y-8">
                
                <div className="space-y-2">
                  <label className="premium-label block ml-1">Solicitante</label>
                  <input 
                    className="input-field"
                    required
                    value={formData.solicitante}
                    onChange={e => setFormData({...formData, solicitante: e.target.value})}
                    placeholder="Nome do solicitante"
                  />
                </div>

                <div className="space-y-2">
                  <label className="premium-label block ml-1">Local</label>
                  <div className="space-y-3">
                    <div className="relative">
                      <select 
                        className="input-field appearance-none cursor-pointer pr-10"
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
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                        <MoreVertical size={14} />
                      </div>
                    </div>
                    
                    {isCustomLocal && (
                      <motion.input 
                        initial={{ opacity: 0, y: -10 }}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="premium-label block ml-1">Motivo</label>
                    <input 
                      className="input-field"
                      required
                      value={formData.reason}
                      onChange={e => setFormData({...formData, reason: e.target.value})}
                      placeholder="Motivo"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="premium-label block ml-1">PN</label>
                    <input 
                      className="input-field"
                      value={formData.pn}
                      onChange={e => setFormData({...formData, pn: e.target.value})}
                      placeholder="Part Number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="premium-label block ml-1">Ação Realizada</label>
                  <textarea 
                    className="input-field min-h-[120px] py-4 resize-none leading-relaxed"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva a ação detalhadamente..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="premium-label block ml-1">Status</label>
                  <div className="relative">
                    <select 
                      className="input-field appearance-none cursor-pointer pr-10"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})}
                    >
                      <option value="A Fazer">A Fazer</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Concluído">Concluído</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                      <MoreVertical size={14} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="premium-label block ml-1">
                    {formData.status === 'Concluído' ? 'Data e Hora de Conclusão' : 'Data e Hora do Agendamento'}
                  </label>
                  <input 
                    type="datetime-local"
                    required
                    className="input-field"
                    value={formData.deadline}
                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={onClose}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    {task ? 'Salvar Alterações' : 'Criar Registro'}
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
  const [activeTab, setActiveTab] = useState<TaskStatus>('A Fazer');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);

  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Task[]>([]);
  const [summaryMode, setSummaryMode] = useState<'daily' | 'consolidated'>('consolidated');
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

  const handleToggleComplete = async (task: Task) => {
    try {
      const newStatus: TaskStatus = task.status === 'Concluído' ? 'A Fazer' : 'Concluído';
      const updatedTask = { ...task, status: newStatus };
      if (newStatus === 'Concluído') {
        updatedTask.deadline = new Date().toISOString().slice(0, 16);
      }
      await dbService.updateTask(updatedTask);
      setToast({ message: `Tarefa marcada como ${newStatus}!`, type: 'success' });
      loadTasks();
    } catch (err) {
      setToast({ message: 'Erro ao atualizar status.', type: 'error' });
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
  const hasUpcoming = upcomingDeadlines.some(t => new Date(t.deadline) > new Date());

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
        <div className="px-4 md:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center justify-between w-full md:w-auto gap-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600 p-2.5 rounded-2xl text-white shadow-xl shadow-emerald-500/20 rotate-6 hover:rotate-0 transition-all duration-700 border border-emerald-400/20">
                <LayoutDashboard size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter leading-none bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">DIÁRIO DE BORDO</h1>
                <p className="premium-label mt-1">Gestão de Operações</p>
              </div>
            </div>
            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-2">
              <div className="relative notifications-container">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2.5 rounded-xl transition-all relative ${
                    hasOverdue ? 'bg-red-50 text-red-500 border border-red-200/50 dark:bg-red-900/10 dark:border-red-800/30' : 
                    hasUpcoming ? 'bg-amber-50 text-amber-500 border border-amber-200/50 dark:bg-amber-900/10 dark:border-amber-800/30' : 
                    'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 border border-transparent'
                  }`}
                >
                  <Bell size={18} />
                  {(hasOverdue || hasUpcoming) && (
                    <span className={`absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white dark:border-[#111113] ${hasOverdue ? 'bg-red-500' : 'bg-amber-500'} animate-pulse`} />
                  )}
                </button>
              </div>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
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

          <div className="hidden md:flex items-center gap-2 shrink-0">
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
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-md bg-white dark:bg-[#0c0c0e] border border-zinc-200/50 dark:border-zinc-800/50 rounded-[2.5rem] shadow-premium overflow-hidden pointer-events-auto"
                      >
                        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-2xl ${hasOverdue ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              <Bell size={20} />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Notificações</h3>
                              <p className="premium-label">Acompanhe seus prazos</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setShowNotifications(false)}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-all"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        
                        <div className="max-h-[60vh] overflow-y-auto p-6 custom-scrollbar">
                          {upcomingDeadlines.length === 0 ? (
                            <div className="py-16 text-center">
                              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-100 dark:border-zinc-800/50">
                                <Bell size={32} className="text-zinc-200 dark:text-zinc-800" />
                              </div>
                              <p className="text-zinc-900 dark:text-white text-sm font-bold">Tudo em dia!</p>
                              <p className="text-zinc-400 text-xs mt-2">Nenhum prazo crítico no momento.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <p className="premium-label px-2">Críticos e Vencidos</p>
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
                                    className={`p-5 rounded-[2rem] transition-all border group cursor-pointer hover-lift ${
                                      isOverdue 
                                        ? 'bg-red-50/30 dark:bg-red-900/5 border-red-200/30 dark:border-red-800/20' 
                                        : 'bg-amber-50/20 dark:bg-amber-900/5 border-amber-200/20 dark:border-amber-800/10'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start gap-4">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate group-hover:text-emerald-600 transition-colors">
                                          {task.solicitante}
                                        </p>
                                        <p className="text-[10px] text-zinc-400 mt-1 truncate">{task.line}</p>
                                        <div className="flex items-center gap-3 mt-4">
                                          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest border ${
                                            isOverdue 
                                              ? 'text-red-500 border-red-200/30 bg-red-500/5' 
                                              : 'text-amber-500 border-amber-200/30 bg-amber-500/5'
                                          }`}>
                                            {isOverdue ? 'Vencido' : 'Próximo'}
                                          </span>
                                          <div className="flex items-center gap-1.5 text-zinc-400">
                                            <Clock size={12} />
                                            <p className="text-[10px] font-bold tracking-tight">
                                              {new Date(task.deadline).toLocaleString('pt-BR')}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-2xl shadow-soft border border-zinc-100 dark:border-zinc-800 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                        <Pencil size={14} className="text-emerald-600" />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        
                        <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/30 border-t border-zinc-100 dark:border-zinc-800/50 text-center">
                          <button 
                            onClick={() => setShowNotifications(false)}
                            className="premium-label hover:text-zinc-900 dark:hover:text-white transition-colors"
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
            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-2" />
            <button 
              onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Novo</span>
            </button>
          </div>
        </div>

        {/* Sub Header: Filters & View Toggles */}
        <div className="px-4 md:px-8 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 bg-zinc-50/30 dark:bg-zinc-900/10 border-b border-zinc-200/40 dark:border-zinc-800/40 overflow-x-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 w-full md:w-auto">
            <div className="flex items-center gap-2 md:gap-3 bg-white dark:bg-[#121214] p-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-soft w-full md:w-auto overflow-x-auto">
              <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 whitespace-nowrap">
                <span className="premium-label hidden sm:inline">Conclusão:</span>
                <input 
                  type="date"
                  className="bg-transparent border-none text-[10px] font-bold uppercase outline-none cursor-pointer text-zinc-600 dark:text-zinc-300"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="text-zinc-200 dark:text-zinc-800 font-light">/</div>
              <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 whitespace-nowrap">
                <input 
                  type="date"
                  className="bg-transparent border-none text-[10px] font-bold uppercase outline-none cursor-pointer text-zinc-600 dark:text-zinc-300"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-all shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 md:gap-2 p-1 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl shadow-inner border border-zinc-200/30 dark:border-zinc-800/30 w-full md:w-auto overflow-x-auto hide-scrollbar">
              {columns.map(status => (
                <button
                  key={status}
                  onClick={() => setActiveTab(status)}
                  className={`relative px-3 md:px-5 py-2 rounded-xl text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-colors duration-500 whitespace-nowrap flex-1 md:flex-none text-center ${activeTab === status ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                  {activeTab === status && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-premium border border-zinc-200/50 dark:border-zinc-700/50"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{status}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button 
              onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
              className="md:hidden bg-emerald-600 dark:bg-emerald-500 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.25em] hover:bg-emerald-700 dark:hover:bg-emerald-400 active:scale-95 transition-all duration-500 shadow-xl shadow-emerald-500/20 dark:shadow-emerald-500/10 border border-emerald-500/20 dark:border-emerald-400/20 flex-1 flex justify-center items-center gap-2 py-3"
            >
              <Plus size={16} />
              <span>Novo</span>
            </button>
            <button 
              onClick={exportToExcel}
              className="p-3 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 transition-all text-emerald-600 hover:shadow-premium border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/50 hover:scale-110 active:scale-95 flex-none flex justify-center"
              title="Exportar Excel"
            >
              <Download size={18} />
            </button>
            <button 
              onClick={exportBackup}
              className="p-3 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 transition-all text-zinc-400 hover:text-zinc-600 hover:shadow-premium border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/50 hover:scale-110 active:scale-95 flex-none flex justify-center"
              title="Backup JSON"
            >
              <ClipboardCheck size={18} />
            </button>
            <label className="p-3 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 transition-all cursor-pointer text-zinc-400 hover:text-zinc-600 hover:shadow-premium border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/50 hover:scale-110 active:scale-95 flex-none flex justify-center" title="Importar JSON">
              <Upload size={18} />
              <input type="file" accept=".json" className="hidden" onChange={importData} />
            </label>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-x-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:24px_24px]">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto h-full flex flex-col"
          >
            <ListView 
              tasks={filteredTasks.filter(t => t.status === activeTab)} 
              onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
              onDelete={handleDeleteTask}
              onToggleComplete={handleToggleComplete}
            />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer / Stats */}
      <footer className="p-4 glass-panel border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-zinc-500 overflow-x-auto hide-scrollbar">
        <div 
          className="flex items-center gap-4 md:gap-6 cursor-pointer group select-none w-full md:w-auto"
          onClick={() => setSummaryMode(prev => prev === 'daily' ? 'consolidated' : 'daily')}
          title="Clique para alternar entre Diário e Consolidado"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 group-hover:border-emerald-500/30 transition-all duration-500 whitespace-nowrap">
            <span className={`transition-colors duration-500 ${summaryMode === 'daily' ? 'text-emerald-600' : 'text-zinc-400'}`}>
              {summaryMode === 'daily' ? 'Diário' : 'Consolidado'}
            </span>
            <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const displayTasks = summaryMode === 'daily' 
                ? tasks.filter(t => t.deadline.startsWith(today) || t.createdAt.startsWith(today))
                : tasks;
              
              const total = displayTasks.length;
              const pending = displayTasks.filter(t => t.status !== 'Concluído').length;
              const overdue = displayTasks.filter(t => t.status !== 'Concluído' && new Date(t.deadline) < new Date()).length;

              return (
                <div className="flex gap-4 md:gap-6 ml-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="hidden sm:inline">Total: {total}</span>
                    <span className="sm:hidden">{total}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="hidden sm:inline">Pendentes: {pending}</span>
                    <span className="sm:hidden">{pending}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="hidden sm:inline">Vencidos: {overdue}</span>
                    <span className="sm:hidden">{overdue}</span>
                  </div>
                </div>
              );
            })()}
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
