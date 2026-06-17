import ItemsList from '@/components/Employees/UploadPhoto/ItemsList';

import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
} from 'lucide-react';

const ControlBtn = ({ onClick, icon: Icon }) => (
  <button onClick={onClick} className="group w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-700/80 shadow-sm border border-border text-slate-400 hover:text-blue-600 transition-all">
    <Icon className="w-5 h-5 transition-transform" />
  </button>
);

const SyncGrid = ({ sync, leftTitle, rightTitle, leftIcon, theme = 'slate' }) => (
  <section className="grid grid-cols-1 lg:grid-cols-11 gap-3 items-start">
    <ItemsList
      title={leftTitle}
      icon={leftIcon}
      items={sync.available}
      checkedItems={sync.checkedItems}
      onToggle={sync.toggleCheck}
      searchTerm={sync.searchTerm}
      onSearchChange={sync.setSearchTerm}
    />
    <div className="lg:col-span-1 flex flex-col justify-center items-center h-[440px]">
      <div className="backdrop-blur-xl border border-border shadow-lg rounded-full px-2 py-4 flex flex-row lg:flex-col gap-2 items-center bg-white/20 dark:bg-slate-800/40">
        <ControlBtn onClick={sync.moveSelectedToRight} icon={ChevronRight} />
        <ControlBtn onClick={sync.moveAllToRight} icon={ChevronsRight} />
        <div className="h-px w-4 lg:w-4 lg:h-px bg-slate-300/50 my-1" />
        <ControlBtn onClick={sync.moveSelectedToLeft} icon={ChevronLeft} />
        <ControlBtn onClick={sync.moveAllToLeft} icon={ChevronsLeft} />
      </div>
    </div>
    <ItemsList
      title={rightTitle}
      icon={CheckCircle2}
      items={sync.selected}
      checkedItems={sync.checkedItems}
      onToggle={sync.toggleCheck}
      theme={theme === 'primary' ? 'primary' : 'primary'}
      badgeLabel="Queued"
      showSyncPlaceholder={true}
    />
  </section>
);

export default SyncGrid;