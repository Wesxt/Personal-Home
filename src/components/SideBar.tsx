import type { Component } from "solid-js";
import { Logo } from "../assets/Logo";

export const SideBar: Component = () => {
  return (
    <aside class="w-64 pr-5 pl-5 border-r border-slate-200/80 bg-white/60 backdrop-blur-md relative flex flex-col justify-between py-8">
      {/* Top Section with Logo */}
      <div class="flex flex-col items-center gap-2 mt-4">
        <Logo></Logo>
        <span class="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">Personal Home</span>
      </div>

      {/* Main Navigation */}
      <nav class="flex flex-col gap-3 my-auto w-full">
        {/* Active connection page */}
        <a
          href="/"
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all to-white border border-[var(--blue-100)] text-[var(--blue-700)] shadow-sm hover:text-[var(--blue-600)]"
        >
          <span class="text-base">🔌</span>
          <span>Conexión Bus</span>
          <span class="ml-auto h-2 w-2 rounded-full bg-[var(--blue-500)] shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
        </a>

        {/* Coming soon pages */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); alert("Direcciones de Grupo estará disponible próximamente."); }}
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-slate-400 hover:text-slate-600 hover:bg-slate-50"
        >
          <span class="text-base text-slate-300">📁</span>
          <span>Direcciones Grupo</span>
          <span class="ml-auto text-[9px] font-bold text-slate-400 bg-slate-100 py-0.5 px-1.5 rounded">PRONTO</span>
        </a>

        <a
          href="#"
          onClick={(e) => { e.preventDefault(); alert("Dispositivos estará disponible próximamente."); }}
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-slate-400 hover:text-slate-600 hover:bg-slate-50"
        >
          <span class="text-base text-slate-300">🎛️</span>
          <span>Dispositivos KNX</span>
          <span class="ml-auto text-[9px] font-bold text-slate-400 bg-slate-100 py-0.5 px-1.5 rounded">PRONTO</span>
        </a>
      </nav>

      {/* Bottom Section */}
      <div class="text-[9px] text-center text-slate-400 font-medium">
        v1.0.0 · Wesxt Core
      </div>
    </aside>
  );
};
