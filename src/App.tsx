import { type Component, onMount } from 'solid-js';
import { SideBar } from './components/SideBar';
import { ConnectionManager } from './components/ConnectionManager';
import { connectWS } from './store/knxStore';

const App: Component = () => {
  onMount(() => {
    // Connect to backend WebSocket gateway on port 8080 by default
    connectWS("ws://localhost:8080");
  });

  return (
    <>
      <div class='flex min-h-screen bg-slate-50/50'>
        <SideBar></SideBar>
        <main class='relative flex-1 p-4 overflow-y-auto'>
          <article class='w-full min-h-[80vh] pb-12'>
            <ConnectionManager />
          </article>
          <footer class='text-[10px] absolute bottom-2 left-4 w-max font-semibold text-slate-400'>
            Personal Home is powered by knx.ts
          </footer>
        </main>
      </div>
    </>
  );
};

export default App;

