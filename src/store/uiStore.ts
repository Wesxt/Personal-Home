import { createSignal } from "solid-js";

export const [currentRoute, setCurrentRoute] = createSignal<"connection" | "group_addresses" | "devices">("connection");
