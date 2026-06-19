import { type Component, onMount, For } from 'solid-js';
import { SideBar } from './components/SideBar';
import { ConnectionManager } from './components/ConnectionManager';
import { GroupAddressManager } from './components/GroupAddressManager';
import { connectWS, alerts, removeAlert } from './store/knxStore';
import { currentRoute } from './store/uiStore';
import { Show } from 'solid-js';

const App: Component = () => {
  onMount(() => {
    // Connect to backend WebSocket gateway on port 8080 by default
    connectWS("ws://localhost:8080");
  });

  return (
    <>
      <div class='flex min-h-screen bg-slate-50/50 relative'>
        <SideBar></SideBar>
        <main class='relative flex-1 p-4 overflow-y-auto'>
          <article class='w-full min-h-[80vh] pb-12'>
            <Show when={currentRoute() === "connection"}>
              <ConnectionManager />
            </Show>
            <Show when={currentRoute() === "group_addresses"}>
              <GroupAddressManager />
            </Show>
          </article>
          <footer class='text-[10px] absolute bottom-2 left-4 w-max font-semibold text-slate-400'>
            Personal Home is powered by knx.ts
          </footer>
        </main>

        {/* Floating Toast Notifications Container */}
        <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
          <For each={alerts()}>
            {(alert) => (
              <div class={`border rounded-xl p-4 shadow-lg backdrop-blur-md flex items-start gap-3 animate-fade-in transition-all ${
                alert.type === "error" 
                  ? "bg-red-50/90 border-red-200 text-red-800" 
                  : alert.type === "warning"
                    ? "bg-amber-50/90 border-amber-200 text-amber-800"
                    : "bg-blue-50/90 border-blue-200 text-blue-800"
              }`}>
                <span class="text-lg">
                  {alert.type === "error" ? "🛑" : alert.type === "warning" ? "⚠️" : "ℹ️"}
                </span>
                <div class="flex-1">
                  <h4 class={`text-xs font-bold ${
                    alert.type === "error" 
                      ? "text-red-900" 
                      : alert.type === "warning"
                        ? "text-amber-900"
                        : "text-blue-900"
                  }`}>
                    {alert.type === "error" ? "Error en Bus KNX" : alert.type === "warning" ? "Advertencia" : "Info"}
                  </h4>
                  <p class={`text-[11px] leading-relaxed mt-0.5 ${
                    alert.type === "error" 
                      ? "text-red-700" 
                      : alert.type === "warning"
                        ? "text-amber-700"
                        : "text-blue-700"
                  }`}>{alert.message}</p>
                  <span class={`text-[9px] font-semibold block mt-1 ${
                    alert.type === "error" 
                      ? "text-red-400" 
                      : alert.type === "warning"
                        ? "text-amber-400"
                        : "text-blue-400"
                  }`}>{alert.timestamp}</span>
                </div>
                <button 
                  onClick={() => removeAlert(alert.id)}
                  class={`transition-colors font-bold text-xs ${
                    alert.type === "error" 
                      ? "text-red-400 hover:text-red-600" 
                      : alert.type === "warning"
                        ? "text-amber-400 hover:text-amber-600"
                        : "text-blue-400 hover:text-blue-600"
                  }`}
                >
                  ✕
                </button>
              </div>
            )}
          </For>
        </div>
      </div>
    </>
  );
};

export default App;


