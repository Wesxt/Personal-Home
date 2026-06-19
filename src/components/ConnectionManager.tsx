import { type Component, createSignal, createEffect, For, Show, onMount } from "solid-js";
import {
  wsConnected,
  knxStatus,
  logs,
  discoveredDevices,
  connectKnx,
  disconnectKnx,
  discoverKnx,
  wsUrl,
  connectWS
} from "../store/knxStore";
import { Tooltip } from "./Tooltip";

export const ConnectionManager: Component = () => {
  const [activeTab, setActiveTab] = createSignal<"tunneling" | "router" | "knxnetipserver" | "tpuart" | "usb">("tunneling");
  const [scanning, setScanning] = createSignal(false);
  const [gatewayUrl, setGatewayUrl] = createSignal(localStorage.getItem("wsURL") ?? "");
  const [showGatewayConfig, setShowGatewayConfig] = createSignal(false);

  let terminalEndRef: HTMLDivElement | undefined;

  // Initialize input states
  const [tunnelingForm, setTunnelingForm] = createSignal({
    ip: "192.168.1.10",
    port: 3671,
    localIp: "",
    localPort: 0,
    transport: "UDP",
    connectionType: 4,
    useRouteBack: false,
    maxQueueSize: 100,
    logLevel: "info",
    logToFile: false,
    logDir: "./logs",
    logFilename: ""
  });

  const [routerForm, setRouterForm] = createSignal({
    individualAddress: "1.1.0",
    handleHopCount: false,
    isUseSingleIA: true,
    logLevel: "info",
    logToFile: false,
    logDir: "./logs",
    logFilename: ""
  });

  const [serverForm, setServerForm] = createSignal({
    ip: "224.0.23.12",
    port: 3671,
    individualAddress: "15.15.0",
    friendlyName: "Personal Home Server",
    macAddress: "",
    clientAddrs: "15.15.10:15",
    routingDelay: 20,
    maxPendingRequests: 100,
    useAllInterfaces: true,
    logLevel: "info",
    logToFile: false,
    logDir: "./logs",
    logFilename: ""
  });

  const [tpuartForm, setTpuartForm] = createSignal({
    path: "/dev/ttyS0",
    individualAddress: "1.1.255",
    ackGroup: true,
    ackIndividual: true,
    logLevel: "info",
    logToFile: false,
    logDir: "./logs",
    logFilename: ""
  });

  const [usbForm, setUsbForm] = createSignal({
    path: "",
    vendorId: 0,
    productId: 0,
    individualAddress: "1.1.250",
    logLevel: "info",
    logToFile: false,
    logDir: "./logs",
    logFilename: ""
  });

  onMount(() => {
    setGatewayUrl(wsUrl());
    gatewayUrl();
  });

  // Auto scroll terminal to bottom on new logs
  createEffect(() => {
    if (logs.length && terminalEndRef) {
      terminalEndRef.scrollIntoView({ behavior: "smooth" });
    }
  });

  // Scan network for devices
  const handleScan = () => {
    setScanning(true);
    discoverKnx();
    setTimeout(() => {
      setScanning(false);
    }, 4000);
  };

  // Populate Tunneling Form from Discovered Device
  const handleSelectDevice = (device: any) => {
    setActiveTab("tunneling");
    setTunnelingForm({
      ...tunnelingForm(),
      ip: device.ip || "",
      port: device.port || 3671
    });
  };

  // Connect action
  const handleConnect = (e: Event) => {
    e.preventDefault();
    if (!wsConnected()) {
      alert("Por favor, conéctese al Servidor Pasarela WebSocket primero.");
      return;
    }

    const type = activeTab();
    let options: any = {};

    const buildLogOptions = (form: any) => {
      return {
        level: form.logLevel,
        enabled: form.logLevel !== "noLog",
        logToFile: form.logToFile,
        logDir: form.logDir || "./logs",
        logFilename: form.logFilename || undefined
      };
    };

    if (type === "tunneling") {
      const form = tunnelingForm();
      options = {
        ip: form.ip,
        port: Number(form.port) || 3671,
        transport: form.transport,
        connectionType: Number(form.connectionType) || 4,
        useRouteBack: form.useRouteBack,
        maxQueueSize: Number(form.maxQueueSize) || 100,
        logOptions: buildLogOptions(form)
      };
      if (form.localIp) options.localIp = form.localIp;
      if (form.localPort) options.localPort = Number(form.localPort);
    } else if (type === "router") {
      const form = routerForm();
      options = {
        individualAddress: form.individualAddress,
        handleHopCount: form.handleHopCount,
        isUseSingleIA: form.isUseSingleIA,
        logOptions: buildLogOptions(form)
      };
    } else if (type === "knxnetipserver") {
      const form = serverForm();
      options = {
        ip: form.ip,
        port: Number(form.port) || 3671,
        individualAddress: form.individualAddress,
        friendlyName: form.friendlyName,
        macAddress: form.macAddress || undefined,
        clientAddrs: form.clientAddrs,
        routingDelay: Number(form.routingDelay) || 20,
        MAX_PENDING_REQUESTS_PER_CLIENT: Number(form.maxPendingRequests) || 100,
        useAllInterfaces: form.useAllInterfaces,
        logOptions: buildLogOptions(form)
      };
    } else if (type === "tpuart") {
      const form = tpuartForm();
      options = {
        path: form.path,
        individualAddress: form.individualAddress,
        ackGroup: form.ackGroup,
        ackIndividual: form.ackIndividual,
        logOptions: buildLogOptions(form)
      };
    } else if (type === "usb") {
      const form = usbForm();
      options = {
        individualAddress: form.individualAddress,
        logOptions: buildLogOptions(form)
      };
      if (form.path) options.path = form.path;
      if (form.vendorId) options.vendorId = Number(form.vendorId);
      if (form.productId) options.productId = Number(form.productId);
    }

    connectKnx(type, options);
  };

  const handleDisconnect = () => {
    disconnectKnx();
  };

  const updateGatewayWS = (e: Event) => {
    e.preventDefault();
    connectWS(gatewayUrl());
    setShowGatewayConfig(false);
  };


  return (
    <div class="space-y-6 p-4 max-w-6xl mx-auto">
      {/* HEADER & GATEWAY CONFIG */}
      <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 border border-slate-200/80 rounded-2xl p-5 backdrop-blur-md shadow-sm">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            🔌 Gestión de Conexiones KNX
          </h1>
          <p class="text-xs text-slate-500 mt-1">
            Configura y conecta dispositivos de comunicación KNXnet/IP, TPUART serial o USB usando la pasarela de control.
          </p>
        </div>
        <div class="flex items-center gap-3">
          {/* Connection Status Badge */}
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/80">
            <span class={`h-2.5 w-2.5 rounded-full ${wsConnected() ? 'bg-green-500 animate-pulse shadow-green-400' : 'bg-red-500'} inline-block`}></span>
            <span class="text-xs font-semibold text-slate-700">
              {wsConnected() ? "Pasarela Activa" : "Pasarela Inactiva"}
            </span>
          </div>

          <button
            onClick={() => setShowGatewayConfig(!showGatewayConfig())}
            class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg py-1.5 px-3 transition-all flex items-center gap-1.5 font-medium"
          >
            ⚙️ {showGatewayConfig() ? "Cerrar" : "Ajustes WS"}
          </button>
        </div>
      </header>

      {/* GATEWAY WEB SOCKET CONFIG DRAWER */}
      <Show when={showGatewayConfig()}>
        <form onSubmit={updateGatewayWS} class="bg-linear-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4 flex gap-3 items-center max-w-md shadow-inner transition-all animate-fade-in">
          <div class="flex-1 flex flex-col gap-1">
            <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dirección WebSocket de la Pasarela</label>
            <input
              type="text"
              value={localStorage.getItem("wsURL") ?? gatewayUrl()}
              onInput={(e) => {
                localStorage.setItem("wsURL", e.currentTarget.value);
                setGatewayUrl(e.currentTarget.value);
              }}
              class="bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            class="bg-(--blue-600) hover:bg-(--blue-700) text-white text-xs font-semibold py-2 px-4 rounded-lg self-end h-9.5 transition-all shadow-md"
          >
            Actualizar
          </button>
        </form>
      </Show>

      {/* ACTIVE KNX CONNECTION STATUS CARD */}
      <div class="bg-white/80 border border-slate-200/80 rounded-2xl p-6 shadow-sm backdrop-blur-md relative overflow-hidden">
        {/* Decorative gradient corner */}
        <div class={`absolute top-0 right-0 h-24 w-24 bg-linear-to-bl ${knxStatus().connected ? 'from-green-500/10 to-transparent' : 'from-(--orange-500)/10 to-transparent'} rounded-bl-full pointer-events-none`}></div>

        <h2 class="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Conexión KNX Activa</h2>
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="flex items-center gap-4">
            <div class={`p-3.5 rounded-2xl ${knxStatus().connected ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-lg font-bold text-slate-900">
                  {knxStatus().connected ? "Conectado al Bus KNX" : "Desconectado del Bus"}
                </span>
                <span class={`h-2.5 w-2.5 rounded-full ${knxStatus().connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-300'}`}></span>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                {knxStatus().connected
                  ? `Canal: ${knxStatus().type.toUpperCase()} | Configurado y enviando tramas.`
                  : "No hay ninguna interfaz KNX activa. Configure un método abajo para conectar."
                }
              </p>
            </div>
          </div>

          <Show when={knxStatus().connected}>
            <div class="flex items-center gap-4 w-full md:w-auto">
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 flex-1 md:flex-initial">
                <div class="font-bold text-slate-600">Detalles:</div>
                <div class="text-slate-500">
                  IP/Ruta: <span class="font-medium text-slate-800">{knxStatus().options.ip || knxStatus().options.path || "N/A"}</span>
                </div>
                <div class="text-slate-500">
                  Dirección Física: <span class="font-medium text-slate-800">{knxStatus().options.individualAddress || "N/A"}</span>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                class="bg-linear-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-semibold text-xs tracking-wider uppercase py-3 px-6 rounded-xl transition-all shadow-md shadow-red-500/10 hover:shadow-red-500/20"
              >
                Desconectar
              </button>
            </div>
          </Show>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CONNECTION FORMS PANEL (LEFT/CENTER) */}
        <div class="lg:col-span-7 space-y-6">
          <Show when={!knxStatus().connected} fallback={
            <div class="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center text-slate-500">
              <span class="text-4xl block mb-3">🔒</span>
              <p class="font-semibold">La pasarela está actualmente conectada.</p>
              <p class="text-xs text-slate-400 mt-1">Desconecte el bus KNX actual para poder configurar una nueva interfaz.</p>
            </div>
          }>
            <div class="bg-white/80 border border-slate-200/80 rounded-2xl shadow-sm backdrop-blur-md overflow-hidden">
              {/* TABS HEADER */}
              <nav class="flex border-b border-slate-200 bg-slate-50/50 p-1.5 gap-1.5 overflow-x-auto">
                <For each={[
                  { id: "tunneling", label: "Túnel IP", icon: "🌐" },
                  { id: "router", label: "IP Router", icon: "📡" },
                  { id: "knxnetipserver", label: "KNX Servidor", icon: "🎛️" },
                  { id: "tpuart", label: "TPUART Serial", icon: "🔌" },
                  { id: "usb", label: "USB", icon: "🔌" }
                ]}>
                  {(tab) => (
                    <button
                      onClick={() => setActiveTab(tab.id as any)}
                      class={`flex items-center gap-1.5 py-2 px-4 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${activeTab() === tab.id
                        ? "bg-(--blue-600) text-white shadow-md shadow-(--blue-600)/20"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  )}
                </For>
              </nav>

              {/* FORMS */}
              <form onSubmit={handleConnect} class="p-6 space-y-5">
                {/* 1. TUNNELING FORM */}
                <Show when={activeTab() === "tunneling"}>
                  <div class="space-y-4">
                    <h3 class="text-sm font-bold text-slate-700 border-b pb-1">Configuración Tunneling Client</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-600 flex items-center">
                          IP Pasarela KNXnet/IP *
                          <Tooltip text="IP address of the KNXnetIP server" />
                        </label>
                        <input
                          type="text"
                          required
                          value={tunnelingForm().ip}
                          onInput={(e) => setTunnelingForm({ ...tunnelingForm(), ip: e.currentTarget.value })}
                          class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                          placeholder="192.168.1.10"
                        />
                      </div>
                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-600 flex items-center">
                          Puerto *
                          <Tooltip text="Port of the KNXnetIP server. Defaults to 3671." />
                        </label>
                        <input
                          type="number"
                          required
                          value={tunnelingForm().port}
                          onInput={(e) => setTunnelingForm({ ...tunnelingForm(), port: parseInt(e.currentTarget.value, 10) })}
                          class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                          placeholder="3671"
                        />
                      </div>
                    </div>

                    {/* COLLAPSIBLE ADVANCED OPTION */}
                    <details class="group border border-slate-100 bg-slate-50/50 rounded-xl p-3 transition-all duration-300">
                      <summary class="text-xs font-bold text-slate-500 cursor-pointer flex justify-between items-center list-none select-none">
                        <span>🛠️ Ajustes Avanzados</span>
                        <span class="group-open:rotate-180 transition-transform duration-200 text-xs">▼</span>
                      </summary>
                      <div class="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-1.5">
                          <label class="text-xs font-bold text-slate-600 flex items-center">
                            IP Local
                            <Tooltip text="Optional local IP to bind to for outbound communication" />
                          </label>
                          <input
                            type="text"
                            value={tunnelingForm().localIp}
                            onInput={(e) => setTunnelingForm({ ...tunnelingForm(), localIp: e.currentTarget.value })}
                            class="border border-slate-200 bg-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                            placeholder="Dejar vacío (Autodetectar)"
                          />
                        </div>
                        <div class="flex flex-col gap-1.5">
                          <label class="text-xs font-bold text-slate-600 flex items-center">
                            Puerto Local
                            <Tooltip text="Optional local port to bind to" />
                          </label>
                          <input
                            type="number"
                            value={tunnelingForm().localPort || ""}
                            onInput={(e) => setTunnelingForm({ ...tunnelingForm(), localPort: parseInt(e.currentTarget.value, 10) || 0 })}
                            class="border border-slate-200 bg-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                            placeholder="Dejar vacío (Aleatorio)"
                          />
                        </div>
                        <div class="flex flex-col gap-1.5">
                          <label class="text-xs font-bold text-slate-600 flex items-center">
                            Transporte
                            <Tooltip text="The transport protocol to use for the connection. 'UDP' is the default and standard. 'TCP' is optional and used for connection-oriented communication." />
                          </label>
                          <select
                            value={tunnelingForm().transport}
                            onChange={(e) => setTunnelingForm({ ...tunnelingForm(), transport: e.currentTarget.value })}
                            class="border border-slate-200 bg-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                          >
                            <option value="UDP">UDP (Recomendado)</option>
                            <option value="TCP">TCP</option>
                          </select>
                        </div>
                        <div class="flex flex-col gap-1.5">
                          <label class="text-xs font-bold text-slate-600 flex items-center">
                            Tipo de Conexión
                            <Tooltip text="Defaults to TUNNEL_CONNECTION (0x04) for standard telegram exchange. Use DEVICE_MGMT_CONNECTION (0x03) for device configuration and management." />
                          </label>
                          <select
                            value={tunnelingForm().connectionType}
                            onChange={(e) => setTunnelingForm({ ...tunnelingForm(), connectionType: parseInt(e.currentTarget.value, 10) })}
                            class="border border-slate-200 bg-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                          >
                            <option value="4">TUNNEL_CONNECTION (0x04)</option>
                            <option value="3">DEVICE_MGMT_CONNECTION (0x03)</option>
                          </select>
                        </div>
                        <div class="flex flex-col gap-1.5">
                          <label class="text-xs font-bold text-slate-600 flex items-center">
                            Cola Máxima de Mensajes
                            <Tooltip text="Maximum number of messages allowed in the outgoing queue. Defaults to 100." />
                          </label>
                          <input
                            type="number"
                            value={tunnelingForm().maxQueueSize}
                            onInput={(e) => setTunnelingForm({ ...tunnelingForm(), maxQueueSize: parseInt(e.currentTarget.value, 10) || 100 })}
                            class="border border-slate-200 bg-white rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                          />
                        </div>
                        <div class="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox"
                            id="useRouteBack"
                            checked={tunnelingForm().useRouteBack}
                            onChange={(e) => setTunnelingForm({ ...tunnelingForm(), useRouteBack: e.currentTarget.checked })}
                            class="h-4 w-4 rounded border-slate-300 text-(--blue-600) focus:ring-(--blue-500)"
                          />
                          <label for="useRouteBack" class="text-xs font-bold text-slate-600 flex items-center cursor-pointer">
                            Usar Route Back
                            <Tooltip text="If true, sends a 'Route Back' HPAI. Instructs the server to respond directly to the source IP and port. Essential for environments with NAT, firewalls or VPNs." />
                          </label>
                        </div>
                        {/* LOGGER SETTINGS SUB-SECTION */}
                        <div class="md:col-span-2 border-t pt-3 mt-2 space-y-3">
                          <h4 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ajustes del Logger Interno</h4>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="flex flex-col gap-1.5">
                              <label class="text-xs font-bold text-slate-600 flex items-center">Nivel del Log</label>
                              <select
                                value={tunnelingForm().logLevel}
                                onChange={(e) => setTunnelingForm({ ...tunnelingForm(), logLevel: e.currentTarget.value })}
                                class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                              >
                                <option value="info">Info (Default)</option>
                                <option value="warn">Warn</option>
                                <option value="error">Error</option>
                                <option value="debug">Debug</option>
                                <option value="noLog">noLog (Desactivado)</option>
                              </select>
                            </div>
                            <div class="flex items-center gap-2 pt-5">
                              <input
                                type="checkbox"
                                id="t_logToFile"
                                checked={tunnelingForm().logToFile}
                                onChange={(e) => setTunnelingForm({ ...tunnelingForm(), logToFile: e.currentTarget.checked })}
                                class="h-4 w-4 rounded border-slate-300"
                              />
                              <label for="t_logToFile" class="text-xs font-bold text-slate-600">Guardar logs en archivo (Worker)</label>
                            </div>
                            <Show when={tunnelingForm().logToFile}>
                              <div class="flex flex-col gap-1.5">
                                <label class="text-xs font-bold text-slate-600">Directorio de Logs</label>
                                <input
                                  type="text"
                                  value={tunnelingForm().logDir}
                                  onInput={(e) => setTunnelingForm({ ...tunnelingForm(), logDir: e.currentTarget.value })}
                                  class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                                />
                              </div>
                              <div class="flex flex-col gap-1.5">
                                <label class="text-xs font-bold text-slate-600">Nombre del archivo (Opcional)</label>
                                <input
                                  type="text"
                                  value={tunnelingForm().logFilename}
                                  onInput={(e) => setTunnelingForm({ ...tunnelingForm(), logFilename: e.currentTarget.value })}
                                  class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                                  placeholder="ej. custom-tunnel.log"
                                />
                              </div>
                            </Show>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                </Show>

                {/* 2. ROUTER FORM */}
                <Show when={activeTab() === "router"}>
                  <div class="space-y-4">
                    <h3 class="text-sm font-bold text-slate-700 border-b pb-1">Configuración IP Router Link</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-600 flex items-center">
                          Dirección Física Principal *
                          <Tooltip text="This individual address will be assigned to all links, except tunneling links; this is done to enable programming devices through ETS." />
                        </label>
                        <input
                          type="text"
                          required
                          value={routerForm().individualAddress}
                          onInput={(e) => setRouterForm({ ...routerForm(), individualAddress: e.currentTarget.value })}
                          class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                          placeholder="1.1.0"
                        />
                      </div>
                    </div>

                    <details class="group border border-slate-100 bg-slate-50/50 rounded-xl p-3">
                      <summary class="text-xs font-bold text-slate-500 cursor-pointer flex justify-between items-center list-none select-none">
                        <span>🛠️ Ajustes Avanzados</span>
                        <span class="group-open:rotate-180 transition-transform duration-200">▼</span>
                      </summary>
                      <div class="pt-4 space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div class="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="handleHopCount"
                              checked={routerForm().handleHopCount}
                              onChange={(e) => setRouterForm({ ...routerForm(), handleHopCount: e.currentTarget.checked })}
                              class="h-4 w-4 rounded border-slate-300"
                            />
                            <label for="handleHopCount" class="text-xs font-bold text-slate-600 flex items-center cursor-pointer">
                              Decrementar Hop Count
                              <Tooltip text="If enabled, the router decrements the hop count each time it routes. If hop count reaches 0, the message is discarded. Avoids routing loops." />
                            </label>
                          </div>
                          <div class="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="isUseSingleIA"
                              checked={routerForm().isUseSingleIA}
                              onChange={(e) => setRouterForm({ ...routerForm(), isUseSingleIA: e.currentTarget.checked })}
                              class="h-4 w-4 rounded border-slate-300"
                            />
                            <label for="isUseSingleIA" class="text-xs font-bold text-slate-600 flex items-center cursor-pointer">
                              Asignar misma dirección física
                              <Tooltip text="This is to assign the same individual address to all links except Tunneling links; default: true" />
                            </label>
                          </div>
                        </div>

                        {/* LOGGER */}
                        <div class="border-t pt-3 space-y-3">
                          <h4 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ajustes del Logger Interno</h4>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="flex flex-col gap-1.5">
                              <label class="text-xs font-bold text-slate-600">Nivel del Log</label>
                              <select
                                value={routerForm().logLevel}
                                onChange={(e) => setRouterForm({ ...routerForm(), logLevel: e.currentTarget.value })}
                                class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                              >
                                <option value="info">Info</option>
                                <option value="warn">Warn</option>
                                <option value="error">Error</option>
                                <option value="debug">Debug</option>
                                <option value="noLog">noLog</option>
                              </select>
                            </div>
                            <div class="flex items-center gap-2 pt-5">
                              <input
                                type="checkbox"
                                id="r_logToFile"
                                checked={routerForm().logToFile}
                                onChange={(e) => setRouterForm({ ...routerForm(), logToFile: e.currentTarget.checked })}
                                class="h-4 w-4 rounded border-slate-300"
                              />
                              <label for="r_logToFile" class="text-xs font-bold text-slate-600">Guardar logs en archivo (Worker)</label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                </Show>

                {/* 3. KNXNETIPSERVER FORM */}
                <Show when={activeTab() === "knxnetipserver"}>
                  <div class="space-y-4">
                    <h3 class="text-sm font-bold text-slate-700 border-b pb-1">Configuración KNXnet/IP Server (Simulador/ETS Bridge)</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-600 flex items-center">
                          IP Multicast
                          <Tooltip text="IP address for Multicast communication. Defaults to standard 224.0.23.12" />
                        </label>
                        <input
                          type="text"
                          value={serverForm().ip}
                          onInput={(e) => setServerForm({ ...serverForm(), ip: e.currentTarget.value })}
                          class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                          placeholder="224.0.23.12"
                        />
                      </div>
                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-600 flex items-center">
                          Puerto de Escucha
                          <Tooltip text="Port for listening to Tunneling clients. Defaults to 3671." />
                        </label>
                        <input
                          type="number"
                          value={serverForm().port}
                          onInput={(e) => setServerForm({ ...serverForm(), port: parseInt(e.currentTarget.value, 10) })}
                          class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                        />
                      </div>
                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-600 flex items-center">
                          Dirección Física Servidor
                          <Tooltip text="Individual address assigned to the KNXnetIP Server. Defaults to 15.15.0." />
                        </label>
                        <input
                          type="text"
                          value={serverForm().individualAddress}
                          onInput={(e) => setServerForm({ ...serverForm(), individualAddress: e.currentTarget.value })}
                          class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                        />
                      </div>
                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-600 flex items-center">
                          Nombre Amigable (Friendly Name)
                          <Tooltip text="The name displayed to other KNXnetIP devices or applications such as ETS." />
                        </label>
                        <input
                          type="text"
                          value={serverForm().friendlyName}
                          onInput={(e) => setServerForm({ ...serverForm(), friendlyName: e.currentTarget.value })}
                          class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                        />
                      </div>
                    </div>

                    <details class="group border border-slate-100 bg-slate-50/50 rounded-xl p-3">
                      <summary class="text-xs font-bold text-slate-500 cursor-pointer flex justify-between items-center list-none select-none">
                        <span>🛠️ Ajustes Avanzados</span>
                        <span class="group-open:rotate-180 transition-transform duration-200">▼</span>
                      </summary>
                      <div class="pt-4 space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-bold text-slate-600 flex items-center">
                              Pool de Clientes (Client Addresses)
                              <Tooltip text="Defines the client address pool for KNXnet/IP Tunneling connections (e.g. '15.15.10:10' or '1.1.1:5'). Format: 'START_ADDRESS:COUNT'." />
                            </label>
                            <input
                              type="text"
                              value={serverForm().clientAddrs}
                              onInput={(e) => setServerForm({ ...serverForm(), clientAddrs: e.currentTarget.value })}
                              class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                              placeholder="15.15.10:10"
                            />
                          </div>
                          <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-bold text-slate-600 flex items-center">
                              Delay de Enrutamiento (ms)
                              <Tooltip text="The minimum delay between two consecutive ROUTING_INDICATION frames sent to the bus. Default is 20ms." />
                            </label>
                            <input
                              type="number"
                              value={serverForm().routingDelay}
                              onInput={(e) => setServerForm({ ...serverForm(), routingDelay: parseInt(e.currentTarget.value, 10) })}
                              class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                            />
                          </div>
                          <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-bold text-slate-600 flex items-center">
                              Peticiones Máx. por Cliente
                              <Tooltip text="Abruptly stops a client if it exceeds this request messages limit per second (default 100). Set to < 1 to disable." />
                            </label>
                            <input
                              type="number"
                              value={serverForm().maxPendingRequests}
                              onInput={(e) => setServerForm({ ...serverForm(), maxPendingRequests: parseInt(e.currentTarget.value, 10) })}
                              class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                            />
                          </div>
                          <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-bold flex items-center text-slate-600">Dirección MAC</label>
                            <input
                              type="text"
                              value={serverForm().macAddress}
                              onInput={(e) => setServerForm({ ...serverForm(), macAddress: e.currentTarget.value })}
                              class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                              placeholder="ej. AA:BB:CC:DD:EE:FF"
                            />
                          </div>
                          <div class="flex items-center gap-2 pt-2">
                            <input
                              type="checkbox"
                              id="useAllInterfaces"
                              checked={serverForm().useAllInterfaces}
                              onChange={(e) => setServerForm({ ...serverForm(), useAllInterfaces: e.currentTarget.checked })}
                              class="h-4 w-4 rounded border-slate-300"
                            />
                            <label for="useAllInterfaces" class="text-xs font-bold text-slate-600 flex items-center cursor-pointer">
                              Multihoming (Usar todas las interfaces)
                              <Tooltip text="If true, server joins multicast group on all valid host network interfaces. Improves discovery in multi-interface systems." />
                            </label>
                          </div>
                        </div>

                        {/* LOGGER */}
                        <div class="border-t pt-3 space-y-3">
                          <h4 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ajustes del Logger Interno</h4>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="flex flex-col gap-1.5">
                              <label class="text-xs font-bold text-slate-600">Nivel del Log</label>
                              <select
                                value={serverForm().logLevel}
                                onChange={(e) => setServerForm({ ...serverForm(), logLevel: e.currentTarget.value })}
                                class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                              >
                                <option value="info">Info</option>
                                <option value="warn">Warn</option>
                                <option value="error">Error</option>
                                <option value="debug">Debug</option>
                                <option value="noLog">noLog</option>
                              </select>
                            </div>
                            <div class="flex items-center gap-2 pt-5">
                              <input
                                type="checkbox"
                                id="s_logToFile"
                                checked={serverForm().logToFile}
                                onChange={(e) => setServerForm({ ...serverForm(), logToFile: e.currentTarget.checked })}
                                class="h-4 w-4 rounded border-slate-300"
                              />
                              <label for="s_logToFile" class="text-xs font-bold text-slate-600">Guardar logs en archivo (Worker)</label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                </Show>

                {/* 4. TPUART SERIAL FORM */}
                <Show when={activeTab() === "tpuart"}>
                  <div class="space-y-4">
                    <h3 class="text-sm font-bold text-slate-700 border-b pb-1">Configuración TPUART (Conexión Serial)</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-600 flex items-center">
                          Ruta del Puerto Serial *
                          <Tooltip text="The serial port path (e.g. '/dev/ttyS0', '/dev/ttyUSB0' on Linux/Pi, or 'COM3' on Windows)" />
                        </label>
                        <input
                          type="text"
                          required
                          value={tpuartForm().path}
                          onInput={(e) => setTpuartForm({ ...tpuartForm(), path: e.currentTarget.value })}
                          class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                          placeholder="COM3 o /dev/ttyS0"
                        />
                      </div>
                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-600 flex items-center">
                          Dirección Física Asignada *
                          <Tooltip text="Physical address to assign to the TPUART chip (e.g. '1.1.255')." />
                        </label>
                        <input
                          type="text"
                          required
                          value={tpuartForm().individualAddress}
                          onInput={(e) => setTpuartForm({ ...tpuartForm(), individualAddress: e.currentTarget.value })}
                          class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                          placeholder="1.1.255"
                        />
                      </div>
                    </div>

                    <details class="group border border-slate-100 bg-slate-50/50 rounded-xl p-3">
                      <summary class="text-xs font-bold text-slate-500 cursor-pointer flex justify-between items-center list-none select-none">
                        <span>🛠️ Ajustes Avanzados</span>
                        <span class="group-open:rotate-180 transition-transform duration-200">▼</span>
                      </summary>
                      <div class="pt-4 space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div class="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="ackGroup"
                              checked={tpuartForm().ackGroup}
                              onChange={(e) => setTpuartForm({ ...tpuartForm(), ackGroup: e.currentTarget.checked })}
                              class="h-4 w-4 rounded border-slate-300"
                            />
                            <label for="ackGroup" class="text-xs font-bold text-slate-600 flex items-center cursor-pointer">
                              Enviar ACK a Telegramas de Grupo
                              <Tooltip text="If true, the TPUART will send an ACK for all group telegrams received on the serial line." />
                            </label>
                          </div>
                          <div class="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="ackIndividual"
                              checked={tpuartForm().ackIndividual}
                              onChange={(e) => setTpuartForm({ ...tpuartForm(), ackIndividual: e.currentTarget.checked })}
                              class="h-4 w-4 rounded border-slate-300"
                            />
                            <label for="ackIndividual" class="text-xs font-bold text-slate-600 flex items-center cursor-pointer">
                              Enviar ACK a Telegramas Individuales
                              <Tooltip text="If true, the TPUART will send an ACK for all individual telegrams addressed to it." />
                            </label>
                          </div>
                        </div>

                        {/* LOGGER */}
                        <div class="border-t pt-3 space-y-3">
                          <h4 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ajustes del Logger Interno</h4>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="flex flex-col gap-1.5">
                              <label class="text-xs font-bold text-slate-600">Nivel del Log</label>
                              <select
                                value={tpuartForm().logLevel}
                                onChange={(e) => setTpuartForm({ ...tpuartForm(), logLevel: e.currentTarget.value })}
                                class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                              >
                                <option value="info">Info</option>
                                <option value="warn">Warn</option>
                                <option value="error">Error</option>
                                <option value="debug">Debug</option>
                                <option value="noLog">noLog</option>
                              </select>
                            </div>
                            <div class="flex items-center gap-2 pt-5">
                              <input
                                type="checkbox"
                                id="tp_logToFile"
                                checked={tpuartForm().logToFile}
                                onChange={(e) => setTpuartForm({ ...tpuartForm(), logToFile: e.currentTarget.checked })}
                                class="h-4 w-4 rounded border-slate-300"
                              />
                              <label for="tp_logToFile" class="text-xs font-bold text-slate-600">Guardar logs en archivo (Worker)</label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                </Show>

                {/* 5. USB FORM */}
                <Show when={activeTab() === "usb"}>
                  <div class="space-y-4">
                    <h3 class="text-sm font-bold text-slate-700 border-b pb-1">Configuración KNX USB Interface</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-600 flex items-center">
                          Ruta del Dispositivo USB (Opcional)
                          <Tooltip text="Path to USB serial node device or handle. Leave blank to let the library auto-detect standard KNX USB devices." />
                        </label>
                        <input
                          type="text"
                          value={usbForm().path}
                          onInput={(e) => setUsbForm({ ...usbForm(), path: e.currentTarget.value })}
                          class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                          placeholder="Auto-detectar si se deja vacío"
                        />
                      </div>
                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-600 flex items-center">
                          Dirección Física Principal *
                          <Tooltip text="Physical address to assign to this USB interface link on the KNX bus." />
                        </label>
                        <input
                          type="text"
                          required
                          value={usbForm().individualAddress}
                          onInput={(e) => setUsbForm({ ...usbForm(), individualAddress: e.currentTarget.value })}
                          class="border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-(--blue-500)/20 outline-none"
                          placeholder="1.1.250"
                        />
                      </div>
                    </div>

                    <details class="group border border-slate-100 bg-slate-50/50 rounded-xl p-3">
                      <summary class="text-xs font-bold text-slate-500 cursor-pointer flex justify-between items-center list-none select-none">
                        <span>🛠️ Ajustes Avanzados</span>
                        <span class="group-open:rotate-180 transition-transform duration-200">▼</span>
                      </summary>
                      <div class="pt-4 space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-bold text-slate-600 flex items-center">
                              Vendor ID
                              <Tooltip text="Numerical USB Vendor ID (optional)" />
                            </label>
                            <input
                              type="number"
                              value={usbForm().vendorId || ""}
                              onInput={(e) => setUsbForm({ ...usbForm(), vendorId: parseInt(e.currentTarget.value, 10) || 0 })}
                              class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                              placeholder="Dejar vacío"
                            />
                          </div>
                          <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-bold text-slate-600 flex items-center">
                              Product ID
                              <Tooltip text="Numerical USB Product ID (optional)" />
                            </label>
                            <input
                              type="number"
                              value={usbForm().productId || ""}
                              onInput={(e) => setUsbForm({ ...usbForm(), productId: parseInt(e.currentTarget.value, 10) || 0 })}
                              class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                              placeholder="Dejar vacío"
                            />
                          </div>
                        </div>

                        {/* LOGGER */}
                        <div class="border-t pt-3 space-y-3">
                          <h4 class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ajustes del Logger Interno</h4>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="flex flex-col gap-1.5">
                              <label class="text-xs font-bold text-slate-600">Nivel del Log</label>
                              <select
                                value={usbForm().logLevel}
                                onChange={(e) => setUsbForm({ ...usbForm(), logLevel: e.currentTarget.value })}
                                class="border border-slate-200 bg-white rounded-lg p-2 text-sm outline-none"
                              >
                                <option value="info">Info</option>
                                <option value="warn">Warn</option>
                                <option value="error">Error</option>
                                <option value="debug">Debug</option>
                                <option value="noLog">noLog</option>
                              </select>
                            </div>
                            <div class="flex items-center gap-2 pt-5">
                              <input
                                type="checkbox"
                                id="u_logToFile"
                                checked={usbForm().logToFile}
                                onChange={(e) => setUsbForm({ ...usbForm(), logToFile: e.currentTarget.checked })}
                                class="h-4 w-4 rounded border-slate-300"
                              />
                              <label for="u_logToFile" class="text-xs font-bold text-slate-600">Guardar logs en archivo (Worker)</label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                </Show>

                {/* SUBMIT BUTTON */}
                <div class="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!wsConnected()}
                    class="orange"
                  >
                    Establecer Conexión
                  </button>
                </div>
              </form>
            </div>
          </Show>

          {/* DEVICE DISCOVERY SCANNER (UNDER FORMS ON DESKTOP) */}
          <div class="bg-white/80 border border-slate-200/80 rounded-2xl p-6 shadow-sm backdrop-blur-md space-y-4">
            <div class="flex justify-between items-center pb-2 border-b">
              <div>
                <h3 class="text-sm font-bold text-slate-700">🔍 Descubridor de Interfaces KNXnet/IP</h3>
                <p class="text-[11px] text-slate-500">Escanea la red local para detectar routers y pasarelas KNXnet/IP activos.</p>
              </div>
              <button
                onClick={handleScan}
                disabled={scanning() || !wsConnected()}
                class={`orange ${scanning()
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-linear-to-r from-(--orange-500) to-(--orange-600) text-white hover:from-(--orange-400) hover:to-(--orange-500) shadow-md shadow-orange-500/10 hover:shadow-orange-500/20"
                  }`}
              >
                <Show when={scanning()} fallback={<span>Escanear Red</span>}>
                  <div class="h-3 w-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Escaneando...</span>
                </Show>
              </button>
            </div>

            <Show when={discoveredDevices().length > 0} fallback={
              <div class="text-center py-6 text-slate-400 text-xs">
                {scanning() ? "Buscando dispositivos en la red..." : "No se han detectado dispositivos aún. Presiona Escanear Red."}
              </div>
            }>
              <div class="overflow-x-auto rounded-xl border border-slate-150">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold">
                      <th class="p-3">Nombre Dispositivo</th>
                      <th class="p-3">Dirección IP</th>
                      <th class="p-3">Dir. Física</th>
                      <th class="p-3">MAC / Serial</th>
                      <th class="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={discoveredDevices()}>
                      {(device) => (
                        <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td class="p-3 font-semibold text-slate-800">{device.friendlyName || "Pasarela KNX"}</td>
                          <td class="p-3 text-slate-600">{device.ip}:{device.port}</td>
                          <td class="p-3 font-mono text-slate-700">
                            {/* Convert physical address representation if numerical */}
                            {typeof device.individualAddress === "number"
                              ? `${(device.individualAddress >> 12) & 0x0f}.${(device.individualAddress >> 8) & 0x0f}.${device.individualAddress & 0xff}`
                              : device.individualAddress
                            }
                          </td>
                          <td class="p-3 text-slate-500 text-[10px] font-mono">{device.macAddress || "Desconocido"}</td>
                          <td class="p-3 text-right">
                            <button
                              onClick={() => handleSelectDevice(device)}
                              class="text-[10px] font-bold text-(--blue-600) hover:text-(--blue-700) bg-(--blue-50) hover:bg-(--blue-100) py-1 px-2.5 rounded-lg border-0 transition-colors"
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </div>
        </div>

        {/* WEBSOCKET LOGS TERMINAL VISUALIZER (RIGHT SIDE) */}
        <div class="lg:col-span-5 flex flex-col h-full min-h-112.5">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col flex-1 shadow-2xl relative overflow-hidden h-full">
            {/* Terminal header */}
            <div class="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
              <div class="flex items-center gap-2">
                {/* Simulated window control buttons */}
                <div class="flex gap-1.5">
                  <span class="h-2.5 w-2.5 rounded-full bg-red-500/80 inline-block"></span>
                  <span class="h-2.5 w-2.5 rounded-full bg-yellow-500/80 inline-block"></span>
                  <span class="h-2.5 w-2.5 rounded-full bg-green-500/80 inline-block"></span>
                </div>
                <span class="text-xs font-mono font-semibold text-slate-400 ml-2">consolawesxt@knx-gateway:~</span>
              </div>
              <div class="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                <span class="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
                <span>WS LIVE FEED</span>
              </div>
            </div>

            {/* Terminal body */}
            <div class="flex-1 overflow-y-auto font-mono text-[11px] space-y-2 p-1.5 bg-slate-950/40 rounded-lg border border-slate-800/60 max-h-120">
              <For each={logs}>
                {(log) => {
                  let badgeColor = "bg-slate-800 text-slate-400";
                  let messageColor = "text-slate-300";

                  if (log.action === "WS_OPEN" || log.action === "connected") {
                    badgeColor = "bg-green-950/50 text-green-400 border border-green-800/40";
                    messageColor = "text-green-300/95";
                  } else if (log.action === "WS_CLOSE" || log.action === "error" || log.error) {
                    badgeColor = "bg-red-950/50 text-red-400 border border-red-800/40";
                    messageColor = "text-red-300/90";
                  } else if (log.action === "connect_knx" || log.action === "disconnect_knx") {
                    badgeColor = "bg-indigo-950/50 text-indigo-400 border border-indigo-800/40";
                    messageColor = "text-indigo-200/90";
                  } else if (log.action === "event") {
                    badgeColor = "bg-amber-950/30 text-amber-400 border border-amber-800/30";
                    messageColor = "text-amber-100/95";
                  } else if (log.action === "write" || log.action === "write_ack") {
                    badgeColor = "bg-cyan-950/50 text-cyan-400 border border-cyan-800/40";
                    messageColor = "text-cyan-200/95";
                  }

                  return (
                    <div class="border-l-2 border-slate-800 pl-2 py-0.5 hover:bg-slate-900/30 transition-colors">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[9px] text-slate-500">[{log.time}]</span>
                        <span class={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${badgeColor}`}>
                          {log.dir === "IN" ? "←" : "→"} {log.action}
                        </span>
                        <Show when={log.src}>
                          <span class="text-[9px] text-slate-400 font-bold bg-slate-900 px-1.5 py-0.2 rounded">{log.src}</span>
                        </Show>
                      </div>

                      <div class={`mt-1 pl-1 whitespace-pre-wrap break-all ${messageColor}`}>
                        {log.data}
                        <Show when={log.decoded !== undefined}>
                          <div class="mt-0.5 text-amber-300/90 bg-amber-950/20 px-2 py-1 rounded text-[10px]">
                            Valor Decodificado: <span class="font-bold text-amber-200">{JSON.stringify(log.decoded)}</span>
                          </div>
                        </Show>
                        <Show when={log.error}>
                          <div class="mt-0.5 text-red-400 font-bold bg-red-950/20 px-2 py-1 rounded text-[10px]">
                            Error: {log.error}
                          </div>
                        </Show>
                      </div>
                    </div>
                  );
                }}
              </For>

              <Show when={logs.length === 0}>
                <div class="text-slate-600 text-center py-20 italic">
                  Esperando eventos de conexión...
                </div>
              </Show>
              <div ref={terminalEndRef}></div>
            </div>

            {/* Terminal footer */}
            <div class="text-[9.5px] text-slate-500 mt-2 font-mono flex justify-between items-center">
              <span>Filtro de Log: Jerárquico pasarela activo</span>
              <span>Total registros: {logs.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
