import { Root } from "@radix-ui/react-collapsible";

const Collapsible = Root;

export { Collapsible };
// biome-ignore lint/performance/noBarrelFile: This file also creates a component from Root, not just re-exports
export {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
