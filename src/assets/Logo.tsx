import type { Component } from "solid-js";
import { Icons } from "../enums/icons";

export const Logo: Component<{}> = () => {

  return <div innerHTML={Icons.logo}></div>;
};