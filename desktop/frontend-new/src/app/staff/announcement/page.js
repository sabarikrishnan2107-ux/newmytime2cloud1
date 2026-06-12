"use client";

import { useEffect, useState } from "react";
import { api, buildQueryParams } from "@/lib/api-client";

const categoryStyles = {
  attendance: { class: "text-purple-300 bg-purple-400/10 border-purple-300/20", icon: "schedule", iconClass: "bg-purple-500 text-white" },
  access_control: { class: "text-red-300 bg-red-400/10 border-red-300/20", icon: "security", iconClass: "bg-red-500 text-white shadow-[0_0_15px_rgba(159,5,25,0.3)]" },
  general: { class: "text-cyan-300 bg-cyan-400/10 border-cyan-300/20", icon: "campaign", iconClass: "bg-cyan-500 text-white" },
  hr: { class: "text-emerald-300 bg-emerald-400/10 border-emerald-300/20", icon: "medical_information", iconClass: "bg-emerald-300 text-[#005b51]" },
  event: { class: "text-amber-300 bg-amber-400/10 border-amber-300/20", icon: "celebration", iconClass: "bg-amber-500 text-white" },
  urgent: { class: "text-red-300 bg-red-400/10 border-red-300/20", icon: "warning", iconClass: "bg-red-500 text-white shadow-[0_0_15px_rgba(159,5,25,0.3)]" },
  default: { class: "text-blue-300 bg-blue-400/10 border-blue-300/20", icon: "info", iconClass: "bg-blue-500 text-white" },
};

function getCategoryStyle(category) {
  const val = typeof category === "string" ? category : category?.name || "";
  const key = val.toLowerCase().replace(/\s+/g, "_");
  return categoryStyles[key] || categoryStyles.default;
}

export default function StaffAnnouncementPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = await buildQueryParams({});
        const { data } = await api.get("/announcement", {
          params: { ...params, per_page: 20, sortDesc: true },
        });
        const items = data?.data || [];
        if (items.length > 0) {
          setFeatured(items[0]);
          setAnnouncements(items.slice(1));
        }
      } catch (e) {
        console.warn("Announcements error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-slate-400 text-sm">Loading announcements...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="flex flex-col gap-8 lg:col-span-12">

            {/* Featured Announcement */}
            {featured && (
              <section className="group relative overflow-hidden rounded-[1.75rem] shadow-2xl">
                <img
                  alt="Announcement background"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070e1b] via-[#070e1b]/45 to-transparent"></div>
                <div className="relative flex min-h-[340px] flex-col items-start justify-end gap-4 p-6 sm:min-h-[400px] sm:p-10">
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cyan-300 backdrop-blur-md">
                    {typeof featured.category === "string" ? featured.category : featured.category?.name || featured.branch?.branch_name || "Featured"}
                  </span>
                  <h1 className="font-headline text-3xl font-extrabold leading-tight text-white drop-shadow-lg sm:text-4xl xl:text-5xl">
                    {featured.title || featured.subject || "Announcement"}
                  </h1>
                  <p className="max-w-xl text-base font-medium text-slate-300 sm:text-lg">
                    {featured.description || ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4">
                    <span className="text-xs text-slate-400">
                      {featured.created_at ? new Date(featured.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {!featured && (
              <div className="text-center text-slate-500 py-20 text-sm">No announcements yet</div>
            )}

            {announcements.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="flex items-center gap-3 font-headline text-2xl font-bold text-white">
                    <span className="h-8 w-1.5 rounded-full bg-cyan-300"></span>
                    Recent Updates
                  </h2>
                </div>

                <div className="flex flex-col gap-4">
                  {announcements.map((a, i) => {
                    const style = getCategoryStyle(a.category || a.type);
                    return (
                      <article
                        key={i}
                        className="staff-glass-card group flex flex-col gap-6 rounded-2xl p-6 transition hover:bg-slate-800/45 sm:flex-row sm:items-start"
                      >
                        <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl ${style.iconClass}`}>
                          <span className="material-symbols-outlined text-3xl">{style.icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.class}`}>
                              {typeof a.category === "string" ? a.category : a.category?.name || a.branch?.branch_name || "Update"}
                            </span>
                            <span className="text-xs text-slate-500">
                              {a.created_at ? new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                            </span>
                          </div>
                          <h3 className="font-headline text-xl font-bold text-white transition group-hover:text-cyan-300">
                            {a.title || a.subject || "---"}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">{a.description || ""}</p>
                          <div className="mt-4 flex flex-wrap items-center gap-6">
                            {a.branch?.branch_name && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="material-symbols-outlined text-sm">location_on</span>
                                <span>{a.branch.branch_name}</span>
                              </div>
                            )}
                            {a.start_date && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="material-symbols-outlined text-sm">schedule</span>
                                <span>{new Date(a.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {a.end_date ? new Date(a.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Ongoing"}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
