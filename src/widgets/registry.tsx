import type { WidgetType } from "@/lib/types";
import type { WidgetModule } from "./types";
import Timer from "./timer/Timer";
import Clock from "./clock/Clock";
import Roster from "./roster/Roster";
import Picker from "./picker/Picker";
import Points from "./points/Points";
import Participation from "./participation/Participation";
import Notes from "./notes/Notes";
import Checklist from "./checklist/Checklist";
import Dice from "./dice/Dice";
import Spinner from "./spinner/Spinner";
import Choice from "./choice/Choice";
import Coin from "./coin/Coin";
import Soundboard from "./soundboard/Soundboard";
import Voice from "./voice/Voice";
import Tally from "./tally/Tally";
import Reward from "./reward/Reward";
import Groups from "./groups/Groups";
import Queue from "./queue/Queue";
import Status from "./status/Status";
import Cues from "./cues/Cues";
import Schedule from "./schedule/Schedule";
import Reminders from "./reminders/Reminders";
import Quiz from "./quiz/Quiz";
import FastFacts from "./fastfacts/FastFacts";
import HallPass from "./hallpass/HallPass";
import ICan, { IWillWidget } from "./ican/ICan";

export const WIDGET_MODULES: Record<WidgetType, WidgetModule> = {
  timer: Timer,
  clock: Clock,
  roster: Roster,
  picker: Picker,
  points: Points,
  participation: Participation,
  notes: Notes,
  checklist: Checklist,
  dice: Dice,
  spinner: Spinner,
  choice: Choice,
  coin: Coin,
  soundboard: Soundboard,
  voice: Voice,
  tally: Tally,
  reward: Reward,
  groups: Groups,
  queue: Queue,
  status: Status,
  cues: Cues,
  schedule: Schedule,
  reminders: Reminders,
  quiz: Quiz,
  fastfacts: FastFacts,
  hallpass: HallPass,
  ican: ICan,
  iwill: IWillWidget,
};
