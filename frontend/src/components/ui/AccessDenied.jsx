import { ShieldAlert } from "lucide-react";

const AccessDenied = () => {
  return (
    // Added 'min-h-screen' and 'w-full' for a true center
    <div className="flex justify-center items-center min-h-screen w-full">
      <div
        className={`w-full max-w-xl p-8 md:p-12 rounded-3xl border text-center transition-all glass-card`}
      >
        {/* Icon Container */}
        <div className="relative inline-block mb-8">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <ShieldAlert className="text-red-500" size={40} />
          </div>
          {/* Pulsing effect */}
          <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping -z-10" />
        </div>

        <h1
          className={`text-2xl md:text-4xl font-bold mb-4 text-white text-gray-900`}
        >
          Access Denied
        </h1>

        <p className="text-sm leading-relaxed mb-10 max-w-sm mx-auto">
          You do not have the necessary permissions to view this resource.
          Please contact your system administrator if you believe this is an
          error.
        </p>

       
      </div>
    </div>
  );
};

export default AccessDenied;
