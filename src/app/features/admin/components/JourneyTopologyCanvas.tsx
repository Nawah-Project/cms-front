import type {
  AdminGroup,
  AdminMember,
  JourneyNodeItem,
  PlotGuidanceItem,
} from "../api/adminApi";
import { JourneyObservatory } from "../journey-observatory/JourneyObservatory";
export interface JourneyTopologyCanvasProps {
  nodes?: JourneyNodeItem[];
  plotGuidances?: PlotGuidanceItem[];
  members?: AdminMember[];
  groups?: AdminGroup[];
  highlightNodeCode?: string | null;
  onInspectMember: (id: string) => void;
  onSendFeedback?: (member: Pick<AdminMember, "id" | "name">) => void;
  readOnly?: boolean;
}
export function JourneyTopologyCanvas({
  onInspectMember,
  onSendFeedback,
  readOnly = false,
}: JourneyTopologyCanvasProps) {
  return (
    <JourneyObservatory
      onInspectMember={onInspectMember}
      onDraftFeedback={onSendFeedback ?? (() => undefined)}
      readOnly={readOnly}
    />
  );
}
