// columns.js
import {
  ScanFace,
  QrCode,
  Fingerprint,
  Hand,
  Lock,
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
import ProfilePicture from "@/components/ProfilePicture";

export default (deleteEmployee, editEmployee) => [
  {
    key: "employee",
    header: "Personnel",
    align: "left",
    render: (e) => (
      <div className="flex items-center gap-5">
        <ProfilePicture src={e.profile_picture} />
        <div>
          <p className="font-medium text-sm text-slate-600 dark:text-stone-100">{e?.first_name}</p>
          <p className="text-xs text-slate-400 dark:text-stone-100">
            ID: {e.employee_id}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "branch",
    header: "Branch",
    align: "left",
    render: (employee) => (
      <div className="text-sm text-slate-600 dark:text-stone-100">
        {employee.branch?.branch_name || "N/A"}
      </div>
    ),
  },
  {
    key: "department",
    header: "Department",
    align: "left",
    render: (employee) => (
      <div className="text-sm text-slate-600 dark:text-stone-100">
        {employee.department?.name || "N/A"}
      </div>
    ),
  },
  {
    key: "position",
    header: "Position",
    align: "center",
    render: (employee) => (
      <div className="text-sm text-slate-600 dark:text-stone-100 text-center">
        {employee.designation?.name || "N/A"}
      </div>
    ),
  },
  {
    key: "mobile_email",
    header: "Mobile / Email",
    align: "center",
    render: (employee) => (
      <div className="text-sm text-center">
        <p className="text-slate-600 dark:text-stone-100">{employee.user?.email || "—"}</p>
        <p className="text-xs text-slate-600 dark:text-stone-100">{employee.phone_number || "—"}</p>
      </div>
    ),
  },
  {
    key: "timezone",
    header: "Join Date",
    align: "center",
    render: (employee) => (
      <div className="text-sm text-slate-600 dark:text-stone-100 text-center">
        {employee.show_joining_date || "N/A"}
      </div>
    ),
  },
  {
    key: "access",
    header: "Access",
    align: "center",
    render: (employee) => {
      const { rfid_card_number, finger_prints, rfid_card_password, palms, profile_picture } = employee;

      const isCardNumberSet =
        rfid_card_number && rfid_card_number !== "" && rfid_card_number !== "0";
      const isFingerPrint = finger_prints && finger_prints.length > 0;
      const isPalms = palms && palms.length > 0;
      const isPasswordSet =
        rfid_card_password && rfid_card_password !== "" && rfid_card_password !== "FFFFFFFF";
      const isFace = profile_picture;

      return (
        <div className="flex items-center justify-center space-x-2 text-[#15803D] dark:text-stone-100">
          {isFace && <ScanFace className="w-5 h-5 hover:text-indigo-600 transition-colors" title="Face" />}
          {isCardNumberSet && <QrCode className="w-5 h-5 hover:text-indigo-600 transition-colors" title="Card" />}
          {isFingerPrint && <Fingerprint className="w-5 h-5 hover:text-indigo-600 transition-colors" title="Fingerprint" />}
          {isPalms && <Hand className="w-5 h-5 hover:text-indigo-600 transition-colors" title="Palms" />}
          {isPasswordSet && <Lock className="w-5 h-5 hover:text-indigo-600 transition-colors" title="Password" />}
        </div>
      );
    },
  },
  {
    key: "actions",
    header: "Actions",
    align: "center",
    render: (employee) => (
      <div className="flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 rounded-full cursor-pointer w-fit">
              <MoreVertical className="w-5 h-5 text-gray-400 dark:text-stone-100" />
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-32 bg-white dark:bg-gray-900 shadow-md rounded-md py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                editEmployee(employee.id)
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">Edit</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                deleteEmployee(employee.id);
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <Trash className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400 font-medium">Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
];
