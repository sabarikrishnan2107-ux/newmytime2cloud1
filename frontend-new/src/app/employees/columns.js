// columns.js
import {
  ScanFace,
  QrCode,
  Fingerprint,
  Hand,
  Lock,
  MoreVertical,
  Pencil,
  Printer,
  Trash,
  MonitorSmartphone,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import ProfilePicture from "@/components/ProfilePicture";

export default (t, deleteEmployee, editEmployee, showHostQr, printCard, showEnrolledDevices, perms = {}) => [
  {
    key: "employee",
    header: t('employees.columns.personnel'),
    align: "left",
    render: (e) => (
      <div className="flex items-center gap-5">
        <ProfilePicture src={e.profile_picture} />
        <div>
          <p className="font-medium text-sm text-slate-600 dark:text-stone-100">{e?.full_name || [e?.first_name, e?.last_name].filter(Boolean).join(" ")}</p>
          <p className="text-xs text-slate-400 dark:text-stone-100">
            ID: {e.employee_id}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "branch",
    header: t('employees.columns.branch'),
    align: "left",
    render: (employee) => (
      <div className="text-sm text-slate-600 dark:text-stone-100">
        {employee.branch?.branch_name || "N/A"}
      </div>
    ),
  },
  {
    key: "department",
    header: t('employees.columns.department'),
    align: "left",
    render: (employee) => (
      <div className="text-sm text-slate-600 dark:text-stone-100">
        {employee.department?.name || "N/A"}
      </div>
    ),
  },
  {
    key: "position",
    header: t('employees.columns.position'),
    align: "left",
    render: (employee) => (
      <div className="text-sm text-slate-600 dark:text-stone-100">
        {employee.designation?.name || "N/A"}
      </div>
    ),
  },
  {
    key: "mobile_email",
    header: t('employees.columns.mobileEmail'),
    align: "left",
    render: (employee) => (
      <div className="text-sm">
        <p className="text-slate-600 dark:text-stone-100">{employee.user?.email || "—"}</p>
        <p className="text-xs text-slate-600 dark:text-stone-100">{employee.phone_number || "—"}</p>
      </div>
    ),
  },
  {
    key: "timezone",
    header: t('employees.columns.joinDate'),
    align: "left",
    render: (employee) => (
      <div className="text-sm text-slate-600 dark:text-stone-100">
        {employee.show_joining_date || "N/A"}
      </div>
    ),
  },
  {
    key: "access",
    header: t('employees.columns.access'),
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
          {isFace && <ScanFace className="w-5 h-5 hover:text-indigo-600 transition-colors" title={t('employees.access.face')} />}
          {isCardNumberSet && <QrCode className="w-5 h-5 hover:text-indigo-600 transition-colors" title={t('employees.access.card')} />}
          {isFingerPrint && <Fingerprint className="w-5 h-5 hover:text-indigo-600 transition-colors" title={t('employees.access.fingerprint')} />}
          {isPalms && <Hand className="w-5 h-5 hover:text-indigo-600 transition-colors" title={t('employees.access.palms')} />}
          {isPasswordSet && <Lock className="w-5 h-5 hover:text-indigo-600 transition-colors" title={t('employees.access.password')} />}
        </div>
      );
    },
  },
  {
    key: "actions",
    header: t('common.actions'),
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
            className="w-36 bg-white dark:bg-gray-900 shadow-md rounded-md py-1"
            onClick={(e) => e.stopPropagation()}
          >
            {perms.canEdit !== false && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                editEmployee(employee.id)
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">{t('common.edit')}</span>
            </DropdownMenuItem>
            )}

            {showHostQr && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  showHostQr(employee);
                }}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-slate-700 dark:text-slate-200 font-medium">{t('employees.actions.hostQr')}</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                if (typeof printCard === "function") printCard(employee);
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">{t('employees.actions.printCard')}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                if (typeof showEnrolledDevices === "function") showEnrolledDevices(employee);
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <MonitorSmartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">{t('employees.actions.devices')}</span>
            </DropdownMenuItem>

            {perms.canDelete !== false && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                deleteEmployee(employee.id);
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <Trash className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400 font-medium">{t('common.delete')}</span>
            </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
];
