import { type Component, createSignal, For, Show, Switch, Match, createEffect } from "solid-js";
import {
  knxStatus,
  subscriptions,
  dpts,
  groupValues,
  groupCemis,
  subscribeKnx,
  unsubscribeKnx,
  configDpt,
  readKnx,
  writeKnx,
  parsingProject,
  parsedProject,
  groupNames,
  groupDescriptions,
  parseKnxProj,
  importGroupAddresses,
  setParsedProject,
} from "../store/knxStore";
import { Tooltip } from "./Tooltip";

const DPT_OPTIONS = [
  { value: "DPT1.001", label: "DPT 1.001 - Switch (On/Off)" },
  { value: "DPT2.001", label: "DPT 2.001 - Priority Control" },
  { value: "DPT3.007", label: "DPT 3.007 - Dimming Control" },
  { value: "DPT4.001", label: "DPT 4.001 - Char / ASCII" },
  { value: "DPT5.001", label: "DPT 5.001 - Scaling / Percentage (0-100%)" },
  { value: "DPT5.003", label: "DPT 5.003 - Angle (0-360°)" },
  { value: "DPT5.010", label: "DPT 5.010 - 1-Byte Unsigned (0-255)" },
  { value: "DPT6.001", label: "DPT 6.001 - 1-Byte Signed (-128..127)" },
  { value: "DPT7.001", label: "DPT 7.001 - 2-Byte Unsigned (0-65535)" },
  { value: "DPT8.001", label: "DPT 8.001 - 2-Byte Signed (-32768..32767)" },
  { value: "DPT9.001", label: "DPT 9.001 - Temperature (°C)" },
  { value: "DPT10.001", label: "DPT 10.001 - Time of Day" },
  { value: "DPT11.001", label: "DPT 11.001 - Date" },
  { value: "DPT12.001", label: "DPT 12.001 - 4-Byte Unsigned" },
  { value: "DPT13.001", label: "DPT 13.001 - 4-Byte Signed" },
  { value: "DPT14.019", label: "DPT 14.xxx - 4-Byte Float" },
  { value: "DPT15.000", label: "DPT 15.000 - Access Control Data" },
  { value: "DPT16.001", label: "DPT 16.001 - String (ASCII)" },
  { value: "DPT20.102", label: "DPT 20.102 - HVAC Mode" },
  { value: "DPT28.001", label: "DPT 28.001 - UTF-8 String" },
  { value: "DPT29.001", label: "DPT 29.001 - 8-Byte Signed" },
  { value: "DPT251.600", label: "DPT 251.600 - RGBW Color (Red/Green/Blue/White)" },
];

const getDptCategory = (dptStr: string): string => {
  if (!dptStr) return "1";
  const norm = dptStr.toLowerCase().replace("dpt", "");
  const main = norm.split(".")[0];
  return main || "1";
};

export const GroupAddressManager: Component = () => {
  const [gaInput, setGaInput] = createSignal("");
  const [dptInput, setDptInput] = createSignal("DPT1.001");
  const [nameInput, setNameInput] = createSignal("");
  const [projectPassword, setProjectPassword] = createSignal("");
  const [selectedGas, setSelectedGas] = createSignal<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = createSignal("");
  const [dptFilter, setDptFilter] = createSignal("ALL");

  // State for Active Subscriptions table
  const [activeSearchTerm, setActiveSearchTerm] = createSignal("");
  const [activeDptFilter, setActiveDptFilter] = createSignal("ALL");
  const [activePage, setActivePage] = createSignal(1);
  const [itemsPerPage, setItemsPerPage] = createSignal(10);
  const [activeSelectedGas, setActiveSelectedGas] = createSignal<Record<string, boolean>>({});
  const [bulkDptInput, setBulkDptInput] = createSignal("DPT1.001");
  const [showDeleteAllModal, setShowDeleteAllModal] = createSignal(false);
  const [deleteAllCountdown, setDeleteAllCountdown] = createSignal(0);

  // Reset pagination when active filters change
  createEffect(() => {
    activeSearchTerm();
    activeDptFilter();
    itemsPerPage();
    setActivePage(1);
  });

  const matchWildcard = (target: string, term: string) => {
    if (!target) return false;
    target = target.toLowerCase();
    if (term.includes('*')) {
      try {
        const regexStr = term.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp(regexStr, 'i').test(target);
      } catch {
        return target.includes(term);
      }
    }
    return target.includes(term);
  };

  const filteredActiveGas = () => {
    const term = activeSearchTerm().toLowerCase().trim();
    const dptF = activeDptFilter();
    return subscriptions().filter(ga => {
      const dpt = dpts[ga] || "";
      if (dptF !== "ALL" && dptF !== "NONE" && dpt !== dptF) return false;
      if (dptF === "NONE" && dpt) return false;
      if (!term) return true;
      const name = groupNames[ga] || "";
      const desc = groupDescriptions[ga] || "";
      return matchWildcard(ga, term) || matchWildcard(name, term) || matchWildcard(desc, term);
    });
  };

  const paginatedActiveGas = () => {
    const start = (activePage() - 1) * itemsPerPage();
    return filteredActiveGas().slice(start, start + itemsPerPage());
  };

  const totalPages = () => Math.max(1, Math.ceil(filteredActiveGas().length / itemsPerPage()));

  const handleBulkDelete = () => {
    const selected = Object.keys(activeSelectedGas()).filter(ga => activeSelectedGas()[ga]);
    if (selected.length === 0) return;
    if (!confirm(`¿Eliminar ${selected.length} suscripciones?`)) return;
    selected.forEach(ga => unsubscribeKnx(ga));
    setActiveSelectedGas({});
  };

  const handleBulkChangeDpt = () => {
    const selected = Object.keys(activeSelectedGas()).filter(ga => activeSelectedGas()[ga]);
    if (selected.length === 0) return;
    const dptToApply = bulkDptInput();
    selected.forEach(ga => configDpt(ga, dptToApply));
    // Optional: we keep selection as per plan or user choice. We'll unselect them to avoid confusion, or let's keep them selected as stated in the plan but give an alert.
    // Actually, deselecting is cleaner after applying a bulk edit in many UX patterns, but I'll follow my plan to keep it simple or just deselect them for safety.
    setActiveSelectedGas({});
  };

  const handleDeleteAllClick = () => {
    setShowDeleteAllModal(true);
    setDeleteAllCountdown(6);
    const interval = setInterval(() => {
      setDeleteAllCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const executeDeleteAll = () => {
    if (deleteAllCountdown() > 0) return;
    subscriptions().forEach(ga => unsubscribeKnx(ga));
    setShowDeleteAllModal(false);
  };

  const isAllOnPageSelected = () => {
    const pageGas = paginatedActiveGas();
    return pageGas.length > 0 && pageGas.every(ga => activeSelectedGas()[ga]);
  };

  const handleSelectAllOnPage = (e: Event) => {
    const checked = (e.currentTarget as HTMLInputElement).checked;
    const updated = { ...activeSelectedGas() };
    paginatedActiveGas().forEach(ga => {
      updated[ga] = checked;
    });
    setActiveSelectedGas(updated);
  };

  createEffect(() => {
    const proj = parsedProject();
    if (proj && proj.group_addresses) {
      const initial: Record<string, boolean> = {};
      proj.group_addresses.forEach((ga: any) => {
        if (!subscriptions().includes(ga.address)) {
          initial[ga.address] = true;
        }
      });
      setSelectedGas(initial);
    }
  });

  const filteredGas = () => {
    const proj = parsedProject();
    if (!proj || !proj.group_addresses) return [];
    const term = searchTerm().toLowerCase().trim();
    const dpt = dptFilter();

    return proj.group_addresses.filter((ga: any) => {
      if (dpt === "NONE" && ga.dpt) return false;
      if (dpt !== "ALL" && dpt !== "NONE" && ga.dpt !== dpt) return false;
      if (!term) return true;
      return matchWildcard(ga.address, term) || matchWildcard(ga.name, term) || matchWildcard(ga.description || "", term);
    });
  };

  const getLinkedDevicesStr = (ga: any) => {
    const proj = parsedProject();
    if (!proj) return "—";
    const ids = ga.communication_object_ids || [];
    if (ids.length === 0) return "—";
    const names = ids.map((id: string) => {
      const co = proj.communication_objects?.[id];
      if (!co) return null;
      const dev = proj.devices?.[co.device_address];
      const devName = dev ? `${dev.name} (${co.device_address})` : co.device_address;
      return `${devName} - ${co.name || co.text || "Objeto"}`;
    }).filter(Boolean);
    return names.length > 0 ? names.join(", ") : "—";
  };

  const handleFileUpload = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1] || result;
      parseKnxProj(base64Data, projectPassword() || undefined);
      setProjectPassword("");
      input.value = "";
    };
    reader.onerror = () => {
      alert("Error al leer el archivo.");
    };
    reader.readAsDataURL(file);
  };

  const handleImport = () => {
    const proj = parsedProject();
    if (!proj) return;
    const selected = Object.keys(selectedGas()).filter(addr => selectedGas()[addr]);
    if (selected.length === 0) {
      alert("Selecciona al menos una dirección de grupo para importar.");
      return;
    }

    const payloadGas = proj.group_addresses
      .filter((ga: any) => selected.includes(ga.address))
      .map((ga: any) => ({
        address: ga.address,
        dpt: ga.dpt || null,
        name: ga.name || null,
        description: ga.description || null
      }));

    importGroupAddresses(payloadGas);
    setParsedProject(null);
  };

  const handleSubscribe = (e: Event) => {
    e.preventDefault();
    if (!knxStatus().connected) {
      alert("Debes conectarte al bus KNX primero.");
      return;
    }
    const ga = gaInput().trim();
    const dpt = dptInput().trim();
    const name = nameInput().trim();

    if (ga) {
      if (subscriptions().includes(ga)) {
        alert("La dirección de grupo ya se encuentra suscrita.");
        return;
      }

      if (dpt) {
        configDpt(ga, dpt);
      }
      subscribeKnx(ga, name || undefined);
      setGaInput("");
      setNameInput("");
    }
  };

  const handleRead = (ga: string) => {
    readKnx(ga);
  };

  const handleUnsubscribe = (ga: string) => {
    unsubscribeKnx(ga);
  };

  return (
    <div class="space-y-6 p-4 max-w-7xl">
      <header class="flex flex-col justify-between items-start gap-2 bg-white/40 border border-slate-200/80 rounded-2xl p-5 backdrop-blur-md shadow-sm">
        <h2 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          📡 Gestión de Direcciones de Grupo
        </h2>
        <p class="text-xs text-slate-500">
          Escucha, lee y escribe valores en las direcciones de grupo del bus KNX de forma visual y estructurada.
        </p>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ADD SUBSCRIPTION FORM */}
        <div class="lg:col-span-3 space-y-6">
          <div class="bg-white/80 border border-slate-200/80 rounded-2xl p-6 shadow-sm backdrop-blur-md">
            <h3 class="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Añadir Dirección de Grupo</h3>
            <form onSubmit={handleSubscribe} class="space-y-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-600 flex items-center">
                  Dirección de Grupo *
                  <Tooltip text="Ejemplo: 1/1/1 o 0/0/1" />
                </label>
                <input
                  type="text"
                  required
                  value={gaInput()}
                  onInput={(e) => setGaInput(e.currentTarget.value)}
                  class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none bg-white text-slate-800"
                  placeholder="1/1/1"
                  disabled={!knxStatus().connected}
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-600 flex items-center">
                  Nombre (Opcional)
                </label>
                <input
                  type="text"
                  value={nameInput()}
                  onInput={(e) => setNameInput(e.currentTarget.value)}
                  class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none bg-white text-slate-800"
                  placeholder="Ej: Luz Principal"
                  disabled={!knxStatus().connected}
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-600 flex items-center">
                  Datapoint Type (DPT)
                  <Tooltip text="Selecciona el tipo de punto de datos correcto para codificar y decodificar los valores en el bus." />
                </label>
                <select
                  value={dptInput()}
                  onChange={(e) => setDptInput(e.currentTarget.value)}
                  class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none bg-white font-semibold text-slate-700"
                  disabled={!knxStatus().connected}
                >
                  <For each={DPT_OPTIONS}>
                    {(opt) => (
                      <option value={opt.value}>{opt.label}</option>
                    )}
                  </For>
                </select>
              </div>
              <button
                type="submit"
                disabled={!knxStatus().connected}
                class={`w-full font-semibold text-xs py-2.5 rounded-xl transition-all shadow-md ${knxStatus().connected
                  ? "bg-(--blue-600) hover:bg-(--blue-700) text-white shadow-(--blue-600)/20"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
              >
                Suscribirse / Escuchar
              </button>
            </form>
          </div>

          {/* IMPORT PROJECT CARD */}
          <div class="bg-white/80 border border-slate-200/80 rounded-2xl p-6 shadow-sm backdrop-blur-md">
            <h3 class="text-sm font-bold text-slate-700 mb-4 border-b pb-2 flex items-center gap-1.5">
              📁 Importar Proyecto KNX
            </h3>
            <div class="space-y-4">
              <p class="text-[10px] text-slate-500 leading-normal">
                Sube un archivo de exportación ETS (<code>.knxproj</code>) para importar tus direcciones de grupo y DPTs automáticamente.
              </p>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold text-slate-600">Contraseña (opcional)</label>
                <input
                  type="password"
                  placeholder="Si está cifrado..."
                  class="border border-slate-200 rounded-lg p-2 text-xs outline-none bg-white text-slate-800"
                  value={projectPassword()}
                  onInput={(e) => setProjectPassword(e.currentTarget.value)}
                />
              </div>

              <div class="relative border-2 border-dashed border-slate-200 rounded-xl hover:border-(--blue-400) transition-colors p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50">
                <input
                  type="file"
                  accept=".knxproj"
                  class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={handleFileUpload}
                  disabled={parsingProject()}
                />
                <Show when={parsingProject()} fallback={
                  <div class="text-center">
                    <span class="text-2xl block mb-1">📁</span>
                    <span class="text-xs font-bold text-slate-600 block">Subir .knxproj</span>
                    <span class="text-[9px] text-slate-400 block mt-0.5">Click o arrastra</span>
                  </div>
                }>
                  <div class="text-center">
                    <span class="inline-block animate-spin text-xl mb-1">⏳</span>
                    <span class="text-xs font-bold text-slate-600 block">Procesando...</span>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVE SUBSCRIPTIONS */}
        <div class="lg:col-span-9">
          <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm min-h-75 w-auto">
            <h3 class="text-sm font-bold text-slate-700 mb-4 border-b pb-2 flex justify-between items-center">
              <span>Suscripciones Activas</span>
              <div class="flex items-center gap-3">
                <span class="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full border border-slate-200">
                  {subscriptions().length} total
                </span>
                <Show when={subscriptions().length > 0}>
                  <button
                    onClick={handleDeleteAllClick}
                    class="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    🗑️ Eliminar Todo
                  </button>
                </Show>
              </div>
            </h3>

            <Show
              when={subscriptions().length > 0}
              fallback={
                <div class="flex flex-col items-center justify-center h-40 text-slate-400 text-center">
                  <span class="text-3xl mb-2">📭</span>
                  <p class="text-sm font-medium">No hay suscripciones</p>
                  <p class="text-xs">Añade una dirección de grupo para empezar a escuchar</p>
                </div>
              }
            >
              {/* Filters for Active Subscriptions */}
              <div class="flex gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Buscar por dirección, nombre o descripción..."
                  value={activeSearchTerm()}
                  onInput={(e) => setActiveSearchTerm(e.currentTarget.value)}
                  class="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-(--blue-500)/20 transition-all bg-white text-slate-800"
                />
                <select
                  value={activeDptFilter()}
                  onChange={(e) => setActiveDptFilter(e.currentTarget.value)}
                  class="border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-(--blue-500)/20 transition-all bg-white text-slate-700 font-semibold"
                >
                  <option value="ALL">Todos los DPTs</option>
                  <For each={[...new Set(subscriptions().map((ga) => dpts[ga]).filter(Boolean))].sort() as string[]}>
                    {(dpt) => <option value={dpt}>{dpt}</option>}
                  </For>
                  <option value="NONE">Sin DPT configurado</option>
                </select>
              </div>

              {/* Bulk Actions Bar */}
              <Show when={Object.values(activeSelectedGas()).some(Boolean)}>
                <div class="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 animate-scale-in">
                  <span class="text-xs font-bold text-blue-700">
                    {Object.values(activeSelectedGas()).filter(Boolean).length} seleccionadas
                  </span>
                  <div class="flex items-center gap-3">
                    <div class="flex items-center gap-1.5 border-r border-blue-200 pr-3">
                      <select
                        value={bulkDptInput()}
                        onChange={(e) => setBulkDptInput(e.currentTarget.value)}
                        class="text-[10px] bg-white border border-blue-200 rounded px-2 py-1 outline-none text-slate-700 uppercase"
                      >
                        <For each={DPT_OPTIONS}>
                          {(opt) => <option value={opt.value}>{opt.value}</option>}
                        </For>
                      </select>
                      <button
                        onClick={handleBulkChangeDpt}
                        class="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[10px] font-bold shadow-sm transition-colors"
                      >
                        Aplicar DPT
                      </button>
                    </div>
                    <button
                      onClick={handleBulkDelete}
                      class="bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center gap-1"
                    >
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              </Show>

              <div class="overflow-x-auto w-full border border-slate-100 rounded-xl">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th class="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={isAllOnPageSelected()}
                          onChange={handleSelectAllOnPage}
                        />
                      </th>
                      <th class="py-3 px-4">Dirección Grupo</th>
                      <th class="py-3 px-4">DPT</th>
                      <th class="py-3 px-4">Último Valor</th>
                      <th class="py-3 px-4">Origen (Físico)</th>
                      <th class="py-3 px-4">Comando / APCI</th>
                      <th class="py-3 px-4 text-right">Escritura / Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100/60 text-xs">
                    <For each={paginatedActiveGas()}>
                      {(ga) => {
                        const currentDpt = () => dpts[ga] || "Desconocido";

                        const displayValue = () => {
                          const value = groupValues[ga];
                          return value !== undefined ? (typeof value === "object" ? JSON.stringify(value) : String(value)) : "—";
                        };

                        const cemi = () => groupCemis[ga];
                        const sourceAddress = () => cemi()?.sourceAddress || "—";

                        const commandType = () => {
                          const c = cemi();
                          if (!c) return "—";

                          const apciCmd = c.apciCommand || c.TPDU?.APDU?.apci?.command;
                          if (apciCmd) {
                            if (apciCmd.includes("Write")) return "Write (Escritura)";
                            if (apciCmd.includes("Read")) return "Read (Lectura)";
                            if (apciCmd.includes("Response")) return "Response (Respuesta)";
                            return apciCmd.replace("A_GroupValue_", "").replace("_Protocol_Data_Unit", "");
                          }
                          return c.obj || "—";
                        };

                        // Scoped inputs state for each subscription row
                        const [sliderVal, setSliderVal] = createSignal(dpts[ga] === "DPT5.001" || dpts[ga] === "5.001" ? 50 : 128);
                        const [numVal, setNumVal] = createSignal(0);
                        const [colorVal, setColorVal] = createSignal("#ff0000");
                        const [whiteVal, setWhiteVal] = createSignal(0);
                        const [timeVal, setTimeVal] = createSignal("12:00:00");
                        const [dateVal, setDateVal] = createSignal(new Date().toISOString().split("T")[0]);
                        const [dimControlVal, setDimControlVal] = createSignal<0 | 1>(1);
                        const [dimStepVal, setDimStepVal] = createSignal<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
                        const [priorityVal, setPriorityVal] = createSignal("1,1");
                        const [textVal, setTextVal] = createSignal("");

                        // DPT 15 access control modal states
                        const [showDpt15Modal, setShowDpt15Modal] = createSignal(false);
                        const [dpt15D6, setDpt15D6] = createSignal(0);
                        const [dpt15D5, setDpt15D5] = createSignal(0);
                        const [dpt15D4, setDpt15D4] = createSignal(0);
                        const [dpt15D3, setDpt15D3] = createSignal(0);
                        const [dpt15D2, setDpt15D2] = createSignal(0);
                        const [dpt15D1, setDpt15D1] = createSignal(0);
                        const [dpt15E, setDpt15E] = createSignal<0 | 1>(0);
                        const [dpt15P, setDpt15P] = createSignal<0 | 1>(0);
                        const [dpt15D, setDpt15D] = createSignal<0 | 1>(0);
                        const [dpt15C, setDpt15C] = createSignal<0 | 1>(0);
                        const [dpt15Index, setDpt15Index] = createSignal(0);

                        return (
                          <tr class={`hover:bg-slate-50/40 transition-colors ${activeSelectedGas()[ga] ? 'bg-blue-50/30' : ''}`}>
                            <td class="py-3.5 px-4 text-center">
                              <input
                                type="checkbox"
                                class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={!!activeSelectedGas()[ga]}
                                onChange={(e) => {
                                  setActiveSelectedGas({
                                    ...activeSelectedGas(),
                                    [ga]: e.currentTarget.checked
                                  });
                                }}
                              />
                            </td>
                            {/* GA Column */}
                            <td class="py-3.5 px-4 text-sm text-slate-800">
                              <div class="flex flex-col gap-1 align-middle">
                                <span class="bg-(--blue-50) text-(--blue-700) font-mono font-bold px-2 py-0.5 rounded-md border border-(--blue-100) w-max">
                                  {ga}
                                </span>
                                <Show when={groupNames[ga]}>
                                  <span class="text-xs text-slate-700 font-bold block leading-tight">{groupNames[ga]}</span>
                                </Show>
                                <Show when={groupDescriptions[ga]}>
                                  <span class="text-[10px] text-slate-400 font-normal block leading-tight">{groupDescriptions[ga]}</span>
                                </Show>
                              </div>
                            </td>

                            {/* DPT Column */}
                            <td class="py-3.5 px-4">
                              <select
                                value={currentDpt()}
                                onChange={(e) => {
                                  configDpt(ga, e.currentTarget.value);
                                }}
                                class="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-1.5 py-0.5 outline-none cursor-pointer focus:ring-1 focus:ring-(--blue-500)/50 transition-all uppercase font-mono"
                              >
                                <For each={DPT_OPTIONS}>
                                  {(opt) => (
                                    <option value={opt.value} class="font-sans normal-case text-xs">
                                      {opt.value} - {opt.label.split(" - ")[1] || opt.label}
                                    </option>
                                  )}
                                </For>
                                <Show when={!DPT_OPTIONS.some(opt => opt.value === currentDpt())}>
                                  <option value={currentDpt()} class="font-sans normal-case text-xs">{currentDpt()}</option>
                                </Show>
                              </select>
                            </td>

                            {/* Decoded Value Column */}
                            <td class="py-3.5 px-4">
                              <span class={`font-mono text-xs font-bold px-2 py-0.5 rounded ${groupValues[ga] !== undefined
                                ? (groupValues[ga] === true || String(groupValues[ga]).toLowerCase() === 'true')
                                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                                  : (groupValues[ga] === false || String(groupValues[ga]).toLowerCase() === 'false')
                                    ? 'text-rose-700 bg-rose-50 border border-rose-100'
                                    : 'text-slate-700 bg-slate-100 border border-slate-200'
                                : 'text-slate-400 font-medium'
                                }`}>
                                {displayValue()}
                              </span>
                            </td>

                            {/* CEMI Source Physical Address Column */}
                            <td class="py-3.5 px-4 font-mono text-xs text-slate-500">
                              {sourceAddress()}
                            </td>

                            {/* CEMI Telegram Command Type Column */}
                            <td class="py-3.5 px-4 text-xs font-semibold">
                              <Show when={cemi()} fallback={<span class="text-slate-400">—</span>}>
                                <span class={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${commandType().includes("Write")
                                  ? "text-blue-700 bg-blue-50 border-blue-100"
                                  : commandType().includes("Read")
                                    ? "text-amber-700 bg-amber-50 border-amber-100"
                                    : commandType().includes("Response")
                                      ? "text-purple-700 bg-purple-50 border-purple-100"
                                      : "text-slate-500 bg-slate-50 border-slate-100"
                                  }`}>
                                  {commandType()}
                                </span>
                              </Show>
                            </td>

                            {/* Actions & Interactive Forms Column */}
                            <td class="py-3.5 px-4 text-right">
                              <div class="flex items-center justify-end gap-3">

                                {/* Dynamic DPT Interactive Form Switch */}
                                <Switch fallback={
                                  // Default Raw Text Input
                                  <div class="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5 focus-within:ring-2 focus-within:ring-(--blue-500)/20 transition-all">
                                    <input
                                      type="text"
                                      placeholder="Valor..."
                                      value={textVal()}
                                      onInput={(e) => setTextVal(e.currentTarget.value)}
                                      class="w-20 bg-transparent text-xs p-1 outline-none text-slate-700 font-semibold"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          let raw: any = textVal().trim();
                                          if (raw === "true") raw = true;
                                          else if (raw === "false") raw = false;
                                          else if (!isNaN(Number(raw))) raw = Number(raw);

                                          writeKnx(ga, raw, dpts[ga]);
                                          setTextVal("");
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        let raw: any = textVal().trim();
                                        if (raw === "true") raw = true;
                                        else if (raw === "false") raw = false;
                                        else if (!isNaN(Number(raw))) raw = Number(raw);

                                        writeKnx(ga, raw, dpts[ga]);
                                        setTextVal("");
                                      }}
                                      class="bg-amber-500 hover:bg-amber-600 text-white rounded px-2 py-1 text-[10px] font-bold transition-all shadow-sm"
                                    >
                                      Write
                                    </button>
                                  </div>
                                }>
                                  {/* DPT 1: Toggle Buttons (ON / OFF) */}
                                  <Match when={getDptCategory(dpts[ga]) === "1"}>
                                    <div class="flex gap-1">
                                      <button
                                        onClick={() => writeKnx(ga, true, dpts[ga])}
                                        class="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded px-2.5 py-1 text-[10px] font-bold transition-all shadow-sm"
                                      >
                                        ON
                                      </button>
                                      <button
                                        onClick={() => writeKnx(ga, false, dpts[ga])}
                                        class="bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded px-2.5 py-1 text-[10px] font-bold transition-all shadow-sm"
                                      >
                                        OFF
                                      </button>
                                    </div>
                                  </Match>

                                  {/* DPT 5: Ranges & Sliders */}
                                  <Match when={getDptCategory(dpts[ga]) === "5"}>
                                    <div class="flex items-center gap-1.5">
                                      <input
                                        type="range"
                                        min="0"
                                        max={dpts[ga] === "DPT5.003" || dpts[ga] === "5.003" ? "360" : dpts[ga] === "DPT5.001" || dpts[ga] === "5.001" ? "100" : "255"}
                                        value={sliderVal()}
                                        onInput={(e) => setSliderVal(Number(e.currentTarget.value))}
                                        class="w-18 h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-amber-500"
                                      />
                                      <span class="text-[9px] font-bold text-slate-500 w-8 text-left">
                                        {sliderVal()}{dpts[ga] === "DPT5.003" || dpts[ga] === "5.003" ? "°" : dpts[ga] === "DPT5.001" || dpts[ga] === "5.001" ? "%" : ""}
                                      </span>
                                      <button
                                        onClick={() => writeKnx(ga, sliderVal(), dpts[ga])}
                                        class="bg-amber-500 hover:bg-amber-600 text-white rounded px-2 py-0.5 text-[9px] font-bold transition-all"
                                      >
                                        Write
                                      </button>
                                    </div>
                                  </Match>

                                  {/* DPT 6, 7, 8, 9, 12, 13, 14, 20, 29: Numeric inputs with specific steps */}
                                  <Match when={["6", "7", "8", "9", "12", "13", "14", "20", "29"].includes(getDptCategory(dpts[ga]))}>
                                    <div class="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5 focus-within:ring-2 focus-within:ring-(--blue-500)/20 transition-all">
                                      <input
                                        type="number"
                                        step={getDptCategory(dpts[ga]) === "9" || getDptCategory(dpts[ga]) === "14" ? "0.1" : "1"}
                                        value={numVal()}
                                        onInput={(e) => setNumVal(Number(e.currentTarget.value))}
                                        class="w-16 bg-transparent text-xs p-1 outline-none text-slate-700 font-semibold"
                                      />
                                      <Show when={getDptCategory(dpts[ga]) === "9"}>
                                        <span class="text-[9px] font-bold text-slate-400 pr-1">°C</span>
                                      </Show>
                                      <button
                                        onClick={() => writeKnx(ga, numVal(), dpts[ga])}
                                        class="bg-amber-500 hover:bg-amber-600 text-white rounded px-2 py-1 text-[10px] font-bold transition-all"
                                      >
                                        Write
                                      </button>
                                    </div>
                                  </Match>

                                  {/* DPT 2: Priority Dropdown */}
                                  <Match when={getDptCategory(dpts[ga]) === "2"}>
                                    <div class="flex items-center gap-1">
                                      <select
                                        value={priorityVal()}
                                        onChange={(e) => setPriorityVal(e.currentTarget.value)}
                                        class="bg-white border border-slate-200 rounded p-1 text-[9px] font-bold text-slate-600 outline-none w-20"
                                      >
                                        <option value="0,0">No Ctrl, Off</option>
                                        <option value="0,1">No Ctrl, On</option>
                                        <option value="1,0">Ctrl, Off</option>
                                        <option value="1,1">Ctrl, On</option>
                                      </select>
                                      <button
                                        onClick={() => {
                                          const parts = priorityVal().split(",");
                                          writeKnx(ga, { control: Number(parts[0]) as any, value: Number(parts[1]) as any }, dpts[ga]);
                                        }}
                                        class="bg-amber-500 hover:bg-amber-600 text-white rounded px-2 py-1 text-[10px] font-bold transition-all"
                                      >
                                        Write
                                      </button>
                                    </div>
                                  </Match>

                                  {/* DPT 3: Dimming Control */}
                                  <Match when={getDptCategory(dpts[ga]) === "3"}>
                                    <div class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                                      <select
                                        value={dimControlVal()}
                                        onChange={(e) => setDimControlVal(Number(e.currentTarget.value) as 0 | 1)}
                                        class="bg-white border border-slate-200 rounded p-0.5 text-[9px] font-bold text-slate-600 outline-none w-16"
                                      >
                                        <option value="1">AUMENTAR</option>
                                        <option value="0">REDUCIR</option>
                                      </select>
                                      <select
                                        value={dimStepVal()}
                                        onChange={(e) => setDimStepVal(Number(e.currentTarget.value) as any)}
                                        class="bg-white border border-slate-200 rounded p-0.5 text-[9px] font-bold text-slate-600 outline-none w-20"
                                      >
                                        <option value="0">0 - Parar</option>
                                        <option value="1">1 - Paso 100%</option>
                                        <option value="2">2 - Paso 50%</option>
                                        <option value="3">3 - Paso 25%</option>
                                        <option value="4">4 - Paso 12.5%</option>
                                        <option value="5">5 - Paso 6%</option>
                                        <option value="6">6 - Paso 3%</option>
                                        <option value="7">7 - Paso 1.5%</option>
                                      </select>
                                      <button
                                        onClick={() => writeKnx(ga, { control: dimControlVal(), stepCode: dimStepVal() }, dpts[ga])}
                                        class="bg-amber-500 hover:bg-amber-600 text-white rounded px-1.5 py-1 text-[9px] font-bold transition-all shadow-sm"
                                      >
                                        Write
                                      </button>
                                    </div>
                                  </Match>

                                  {/* DPT 10: Time picker */}
                                  <Match when={getDptCategory(dpts[ga]) === "10"}>
                                    <div class="flex items-center gap-1">
                                      <input
                                        type="time"
                                        step="1"
                                        value={timeVal()}
                                        onInput={(e) => setTimeVal(e.currentTarget.value)}
                                        class="bg-white border border-slate-200 rounded p-0.5 text-[9px] font-bold text-slate-600 outline-none w-20"
                                      />
                                      <button
                                        onClick={() => {
                                          const parts = timeVal().split(":");
                                          const hrs = Number(parts[0] || 0);
                                          const mins = Number(parts[1] || 0);
                                          const secs = Number(parts[2] || 0);
                                          writeKnx(ga, { day: 0, hour: hrs, minutes: mins, seconds: secs }, dpts[ga]);
                                        }}
                                        class="bg-amber-500 hover:bg-amber-600 text-white rounded px-2 py-0.5 text-[9px] font-bold transition-all"
                                      >
                                        Write
                                      </button>
                                    </div>
                                  </Match>

                                  {/* DPT 11: Date picker */}
                                  <Match when={getDptCategory(dpts[ga]) === "11"}>
                                    <div class="flex items-center gap-1">
                                      <input
                                        type="date"
                                        value={dateVal()}
                                        onInput={(e) => setDateVal(e.currentTarget.value)}
                                        class="bg-white border border-slate-200 rounded p-0.5 text-[9px] font-bold text-slate-600 outline-none w-24"
                                      />
                                      <button
                                        onClick={() => {
                                          const parts = dateVal().split("-");
                                          const yr = Number(parts[0] || new Date().getFullYear());
                                          const mo = Number(parts[1] || 1);
                                          const dy = Number(parts[2] || 1);
                                          writeKnx(ga, { day: dy, month: mo, year: yr }, dpts[ga]);
                                        }}
                                        class="bg-amber-500 hover:bg-amber-600 text-white rounded px-2 py-0.5 text-[9px] font-bold transition-all"
                                      >
                                        Write
                                      </button>
                                    </div>
                                  </Match>

                                  {/* DPT 15: Access Data Dialog Button */}
                                  <Match when={getDptCategory(dpts[ga]) === "15"}>
                                    <div class="flex items-center gap-1.5 justify-end">
                                      <button
                                        onClick={() => setShowDpt15Modal(true)}
                                        class="bg-amber-500 hover:bg-amber-600 text-white rounded px-2.5 py-1.5 text-[10px] font-bold transition-all shadow-sm flex items-center gap-1"
                                      >
                                        <span>🔑 Config. Acceso</span>
                                      </button>

                                      {/* Modal Dialog */}
                                      <Show when={showDpt15Modal()}>
                                        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                                          <div class="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 text-left animate-scale-in">
                                            <header class="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                                              <h4 class="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                                                🔑 Configurar DPT 15 - Dirección {ga}
                                              </h4>
                                              <button
                                                onClick={() => setShowDpt15Modal(false)}
                                                class="text-slate-400 hover:text-slate-600 font-bold text-xs"
                                              >
                                                ✕
                                              </button>
                                            </header>

                                            <div class="grid grid-cols-3 gap-3 mb-5">
                                              {/* D1-D6 */}
                                              <For each={[
                                                { label: "D1 (LSB)", val: dpt15D1, set: setDpt15D1 },
                                                { label: "D2", val: dpt15D2, set: setDpt15D2 },
                                                { label: "D3", val: dpt15D3, set: setDpt15D3 },
                                                { label: "D4", val: dpt15D4, set: setDpt15D4 },
                                                { label: "D5", val: dpt15D5, set: setDpt15D5 },
                                                { label: "D6 (MSB)", val: dpt15D6, set: setDpt15D6 },
                                              ]}>
                                                {(item) => (
                                                  <div class="flex flex-col gap-1">
                                                    <label class="text-[9px] font-bold text-slate-500">{item.label}</label>
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      max="9"
                                                      value={item.val()}
                                                      onInput={(e) => item.set(Math.min(9, Math.max(0, Number(e.currentTarget.value))))}
                                                      class="border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white"
                                                    />
                                                  </div>
                                                )}
                                              </For>

                                              {/* Flags E, P, D, C */}
                                              <For each={[
                                                { label: "E (Enable)", val: dpt15E, set: setDpt15E },
                                                { label: "P (Priority)", val: dpt15P, set: setDpt15P },
                                                { label: "D (Dir)", val: dpt15D, set: setDpt15D },
                                                { label: "C (Ctrl)", val: dpt15C, set: setDpt15C },
                                              ]}>
                                                {(item) => (
                                                  <div class="flex flex-col gap-1">
                                                    <label class="text-[9px] font-bold text-slate-500">{item.label}</label>
                                                    <select
                                                      value={item.val()}
                                                      onChange={(e) => item.set(Number(e.currentTarget.value) as 0 | 1)}
                                                      class="border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white outline-none"
                                                    >
                                                      <option value="0">0</option>
                                                      <option value="1">1</option>
                                                    </select>
                                                  </div>
                                                )}
                                              </For>

                                              {/* Index */}
                                              <div class="flex flex-col gap-1 col-span-2">
                                                <label class="text-[9px] font-bold text-slate-500">Index (Índice)</label>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={dpt15Index()}
                                                  onInput={(e) => setDpt15Index(Number(e.currentTarget.value))}
                                                  class="border border-slate-200 rounded p-1 text-xs text-slate-700 bg-white"
                                                />
                                              </div>
                                            </div>

                                            <footer class="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                              <button
                                                onClick={() => setShowDpt15Modal(false)}
                                                class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                                              >
                                                Cancelar
                                              </button>
                                              <button
                                                onClick={() => {
                                                  writeKnx(ga, {
                                                    D6: dpt15D6(),
                                                    D5: dpt15D5(),
                                                    D4: dpt15D4(),
                                                    D3: dpt15D3(),
                                                    D2: dpt15D2(),
                                                    D1: dpt15D1(),
                                                    E: dpt15E(),
                                                    P: dpt15P(),
                                                    D: dpt15D(),
                                                    c: dpt15C(),
                                                    C: dpt15C(),
                                                    index: dpt15Index(),
                                                  }, dpts[ga]);
                                                  setShowDpt15Modal(false);
                                                }}
                                                class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors"
                                              >
                                                Escribir Valor
                                              </button>
                                            </footer>
                                          </div>
                                        </div>
                                      </Show>
                                    </div>
                                  </Match>

                                  {/* DPT 251: RGBW Color Control */}
                                  <Match when={getDptCategory(dpts[ga]) === "251"}>
                                    <div class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                                      <div class="flex flex-col items-center gap-0.5">
                                        <span class="text-[7px] font-extrabold text-slate-400">RGB</span>
                                        <input
                                          type="color"
                                          value={colorVal()}
                                          onInput={(e) => setColorVal(e.currentTarget.value)}
                                          class="h-5 w-5 rounded cursor-pointer border border-slate-200 p-0"
                                        />
                                      </div>
                                      <div class="flex flex-col items-start gap-0.5">
                                        <span class="text-[7px] font-extrabold text-slate-400">W: {whiteVal()}</span>
                                        <input
                                          type="range"
                                          min="0"
                                          max="255"
                                          value={whiteVal()}
                                          onInput={(e) => setWhiteVal(Number(e.currentTarget.value))}
                                          class="w-12 h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-slate-600"
                                        />
                                      </div>
                                      <button
                                        onClick={() => {
                                          const hex = colorVal();
                                          const r = parseInt(hex.substring(1, 3), 16);
                                          const g = parseInt(hex.substring(3, 5), 16);
                                          const b = parseInt(hex.substring(5, 7), 16);
                                          const w = whiteVal();
                                          writeKnx(ga, { R: r, G: g, B: b, W: w, mR: 1, mG: 1, mB: 1, mW: 1 }, dpts[ga]);
                                        }}
                                        class="bg-amber-500 hover:bg-amber-600 text-white rounded px-1.5 py-1 text-[8px] font-bold transition-all self-end"
                                      >
                                        Write
                                      </button>
                                    </div>
                                  </Match>
                                </Switch>

                                {/* Direct Read Trigger Button */}
                                <button
                                  onClick={() => handleRead(ga)}
                                  class="bg-sky-50 hover:bg-sky-100 active:bg-sky-200 text-sky-700 border border-sky-200/80 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
                                  title="Solicitar valor del bus (Read Request)"
                                >
                                  Read
                                </button>

                                {/* Delete subscription button */}
                                <button
                                  onClick={() => handleUnsubscribe(ga)}
                                  class="bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 border border-rose-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                  title="Dejar de escuchar"
                                >
                                  ❌
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }}
                    </For>
                    <Show when={paginatedActiveGas().length === 0}>
                      <tr>
                        <td colspan="7" class="py-10 text-center text-slate-400 text-xs">
                          No se encontraron suscripciones activas que coincidan con los filtros.
                        </td>
                      </tr>
                    </Show>
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <Show when={filteredActiveGas().length > 0}>
                <div class="flex items-center justify-between mt-4">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-slate-500 font-medium">Elementos por página:</span>
                    <select
                      value={itemsPerPage()}
                      onChange={(e) => setItemsPerPage(Number(e.currentTarget.value))}
                      class="border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-slate-700"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>

                  <div class="flex items-center gap-4">
                    <span class="text-xs text-slate-500">
                      Página <span class="font-bold text-slate-700">{activePage()}</span> de <span class="font-bold text-slate-700">{totalPages()}</span>
                    </span>
                    <div class="flex items-center gap-1">
                      <button
                        disabled={activePage() === 1}
                        onClick={() => setActivePage(p => Math.max(1, p - 1))}
                        class="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button
                        disabled={activePage() === totalPages()}
                        onClick={() => setActivePage(p => Math.min(totalPages(), p + 1))}
                        class="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </Show>
            </Show>
          </div>
        </div>
      </div>

      {/* KNX Project Import Modal */}
      <Show when={parsedProject()}>
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-4xl w-full max-h-[85vh] flex flex-col p-6 text-left animate-scale-in">
            <header class="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 class="font-bold text-base text-slate-800 flex items-center gap-2">
                  📁 Importar Direcciones de Grupo
                </h3>
                <p class="text-xs text-slate-500 mt-1">
                  Proyecto: <span class="font-semibold text-slate-700">{parsedProject()?.info?.name || "Desconocido"}</span> · Encontradas: <span class="font-semibold text-slate-700">{parsedProject()?.group_addresses?.length || 0}</span> direcciones
                </p>
              </div>
              <button
                onClick={() => setParsedProject(null)}
                class="text-slate-400 hover:text-slate-600 font-bold text-xs bg-slate-50 hover:bg-slate-100 rounded-full h-7 w-7 flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </header>

            {/* Filters bar */}
            <div class="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Buscar por dirección, nombre o descripción..."
                value={searchTerm()}
                onInput={(e) => setSearchTerm(e.currentTarget.value)}
                class="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-(--blue-500)/20 transition-all bg-white text-slate-800"
              />
              <select
                value={dptFilter()}
                onChange={(e) => setDptFilter(e.currentTarget.value)}
                class="border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-(--blue-500)/20 transition-all bg-white text-slate-700 font-semibold"
              >
                <option value="ALL">Todos los DPTs</option>
                <For each={[...new Set(parsedProject()?.group_addresses?.map((ga: any) => ga.dpt).filter(Boolean))].sort() as string[]}>
                  {(dpt) => <option value={dpt}>{dpt}</option>}
                </For>
                <option value="NONE">Sin DPT configurado</option>
              </select>
            </div>

            {/* List Table */}
            <div class="flex-1 overflow-y-auto border border-slate-100 rounded-2xl mb-5">
              <table class="w-full text-left border-collapse">
                <thead class="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                  <tr class="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th class="py-2.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={
                          filteredGas().length > 0 &&
                          filteredGas().every((ga: any) => selectedGas()[ga.address])
                        }
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          const updated = { ...selectedGas() };
                          filteredGas().forEach((ga: any) => {
                            updated[ga.address] = checked;
                          });
                          setSelectedGas(updated);
                        }}
                      />
                    </th>
                    <th class="py-2.5 px-4 w-28">Dirección</th>
                    <th class="py-2.5 px-4 w-48">Nombre</th>
                    <th class="py-2.5 px-4 w-24">DPT</th>
                    <th class="py-2.5 px-4">Descripción / Dispositivos</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-xs">
                  <For each={filteredGas()}>
                    {(ga) => {
                      const isSubscribed = () => subscriptions().includes(ga.address);
                      return (
                        <tr class={`hover:bg-slate-50/50 transition-colors ${isSubscribed() ? "opacity-60 bg-slate-50/20" : ""}`}>
                          <td class="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              checked={!!selectedGas()[ga.address]}
                              onChange={(e) => {
                                setSelectedGas({
                                  ...selectedGas(),
                                  [ga.address]: e.currentTarget.checked
                                });
                              }}
                            />
                          </td>
                          <td class="py-3 px-4 font-mono font-bold text-(--blue-700)">{ga.address}</td>
                          <td class="py-3 px-4 font-semibold text-slate-700">{ga.name}</td>
                          <td class="py-3 px-4">
                            <span class={`font-mono px-1.5 py-0.5 rounded text-[10px] font-bold ${ga.dpt ? "bg-amber-50 text-amber-800 border border-amber-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
                              {ga.dpt || "Sin DPT"}
                            </span>
                          </td>
                          <td class="py-3 px-4 text-slate-500">
                            <div class="flex flex-col gap-0.5">
                              <span class="block text-slate-600">{ga.description || <span class="italic text-slate-400">Sin descripción</span>}</span>
                              <span class="block text-[10px] text-slate-400 font-mono">Dispositivos: {getLinkedDevicesStr(ga)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }}
                  </For>
                  <Show when={filteredGas().length === 0}>
                    <tr>
                      <td colspan="5" class="py-10 text-center text-slate-400">
                        No se encontraron direcciones de grupo que coincidan con los filtros.
                      </td>
                    </tr>
                  </Show>
                </tbody>
              </table>
            </div>

            <footer class="flex justify-between items-center border-t border-slate-100 pt-4">
              <span class="text-xs text-slate-500">
                Seleccionadas: <span class="font-bold text-slate-700">{Object.values(selectedGas()).filter(Boolean).length}</span> de <span class="font-bold text-slate-700">{filteredGas().length}</span>
              </span>
              <div class="flex gap-2">
                <button
                  onClick={() => setParsedProject(null)}
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  class="px-4 py-2 rounded-xl text-xs font-semibold bg-(--blue-600) hover:bg-(--blue-700) text-white shadow-md shadow-(--blue-600)/20 transition-all"
                >
                  Importar y Suscribirse
                </button>
              </div>
            </footer>
          </div>
        </div>
      </Show>

      {/* Delete All Modal */}
      <Show when={showDeleteAllModal()}>
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full p-6 text-center animate-scale-in">
            <div class="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ⚠️
            </div>
            <h3 class="font-bold text-lg text-slate-800 mb-2">
              ¿Eliminar TODAS las suscripciones?
            </h3>
            <p class="text-sm text-slate-500 mb-6 leading-relaxed">
              Esta acción eliminará de forma permanente las <b class="text-rose-600">{subscriptions().length}</b> direcciones de grupo de tu base de datos y de la memoria. Esta acción no se puede deshacer.
            </p>
            
            <div class="flex gap-3 w-full">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteAll}
                disabled={deleteAllCountdown() > 0}
                class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md flex items-center justify-center gap-2"
                style={{
                  "background-color": deleteAllCountdown() > 0 ? "#cbd5e1" : "#e11d48",
                  "cursor": deleteAllCountdown() > 0 ? "not-allowed" : "pointer",
                }}
              >
                {deleteAllCountdown() > 0 ? `Esperar (${deleteAllCountdown()}s)` : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
