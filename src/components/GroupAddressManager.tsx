import { type Component, createSignal, For, Show, Switch, Match } from "solid-js";
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

  const handleSubscribe = (e: Event) => {
    e.preventDefault();
    if (!knxStatus().connected) {
      alert("Debes conectarte al bus KNX primero.");
      return;
    }
    const ga = gaInput().trim();
    const dpt = dptInput().trim();

    if (ga) {
      if (dpt) {
        configDpt(ga, dpt);
      }
      subscribeKnx(ga);
      setGaInput("");
    }
  };

  const handleRead = (ga: string) => {
    readKnx(ga);
  };

  const handleUnsubscribe = (ga: string) => {
    unsubscribeKnx(ga);
  };

  return (
    <div class="space-y-6 p-4 max-w-7xl mx-6 mt-6">
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
        </div>

        {/* ACTIVE SUBSCRIPTIONS */}
        <div class="lg:col-span-9">
          <div class="bg-white/80 border border-slate-200/80 rounded-2xl p-6 shadow-sm min-h-75 w-max">
            <h3 class="text-sm font-bold text-slate-700 mb-4 border-b pb-2 flex justify-between items-center">
              <span>Suscripciones Activas</span>
              <span class="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full border border-slate-200">
                {subscriptions().length} total
              </span>
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
              <div class="overflow-x-auto w-full">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th class="py-3 px-4">Dirección Grupo</th>
                      <th class="py-3 px-4">DPT</th>
                      <th class="py-3 px-4">Último Valor</th>
                      <th class="py-3 px-4">Origen (Físico)</th>
                      <th class="py-3 px-4">Comando / APCI</th>
                      <th class="py-3 px-4 text-right">Escritura / Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100/60">
                    <For each={subscriptions()}>
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
                          <tr class="hover:bg-slate-50/40 transition-colors">
                            {/* GA Column */}
                            <td class="py-3.5 px-4 font-mono font-bold text-sm text-(--blue-700)">
                              <span class="bg-(--blue-50) px-2 py-0.5 rounded-md border border-(--blue-100)">
                                {ga}
                              </span>
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
                  </tbody>
                </table>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};
