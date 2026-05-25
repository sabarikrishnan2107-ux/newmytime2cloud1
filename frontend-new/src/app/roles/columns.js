// columns.js
import {
  MoreVertical,
  Pencil,
  Trash
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";




export default (deleteItem, editItem) => [

  {
    key: "name",
    header: "Name",
    render: (item) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">{item.name || "—"}</p>
      </div>
    ),
  },

  {
    key: "description",
    header: "Description",
    render: (item) => (
      <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
        <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">{item.description || "—"}</p>
      </div>
    ),
  },

  {
    key: "modules",
    header: "Modules",
    render: (item) => {

      let trueModules = item?.modules ? Object.keys(item?.modules).filter(k => item?.modules[k]).join(", ") : "—"

      return (
        <div className="text-sm text-slate-600 dark:text-slate-300 hidden xl:table-cell">
          <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">{trueModules}</p>
        </div>
      )
    },
  },

  {
    key: "actions",
    header: "Actions",
    render: (item) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MoreVertical className="w-5 h-5  text-gray-400 hover:text-gray-700 cursor-pointer" title="More Options" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-30  shadow-md rounded-md py-1">
          <DropdownMenuItem
            onSelect={() => editItem(item.id)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-slate-300 cursor-pointer"
          >
            <Pencil className="w-4 h-4" /> <span>Edit</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => deleteItem(item.id)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-slate-300 cursor-pointer"
          >
            <Trash className="w-4 h-4" /> <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
