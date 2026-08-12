/** All help copy lives here as plain data so the words can be edited
 * without touching layout code. Keep the language simple and short.
 * No medical claims: the app helps people notice patterns, nothing
 * more. */

import { hpaToInHg } from '../data/units';
import { RATE_WINDOWS_HOURS, TENDENCY } from '../utils/constants';

export interface HelpSection {
  heading: string;
  paragraphs: string[];
  /** Optional bullet list rendered after the paragraphs. */
  items?: string[];
}

/* The threshold numbers below come straight from the app's constants
 * so the help can never drift out of sync with the labels. */
const SLOW = Math.abs(TENDENCY.FALLING);
const FAST = Math.abs(TENDENCY.FALLING_FAST);
const SLOW_INHG = hpaToInHg(SLOW).toFixed(3);
const FAST_INHG = hpaToInHg(FAST).toFixed(2);
const WINDOWS = RATE_WINDOWS_HOURS.join(', ');

export const HELP_TITLE = 'How to use Pressure Log';

export const HELP_SECTIONS: HelpSection[] = [
  {
    heading: 'What is air pressure?',
    paragraphs: [
      'Air has weight. Air pressure is the weight of all the air above you, pressing down on you. You cannot feel it, but your barometer can.',
      'When weather systems move through, the amount of air above you changes. Storms bring rising, lighter air, so the pressure drops. Calm and clear weather usually comes with sinking, heavier air, so the pressure climbs.',
    ],
  },
  {
    heading: 'The units: hPa and inHg',
    paragraphs: [
      'hPa is short for hectopascal. inHg is short for inches of mercury. They are two scales for the same thing, like kilometers and miles.',
      'A normal day near sea level is around 1013 hPa, which is about 29.9 inHg.',
      'Tap the hPa or inHg button above the chart to switch. The app remembers your choice.',
    ],
  },
  {
    heading: 'Reading the chart',
    paragraphs: [
      'The chart shows air pressure over time. Time runs left to right, so the newest reading is on the right.',
      'The buttons above the chart (1 d, 2 d, 5 d, 10 d, All) choose how many days you see.',
      'The row of numbers above the chart shows the lowest, highest, and average pressure for what is on screen, plus the latest reading.',
    ],
  },
  {
    heading: 'Rate of change',
    paragraphs: [
      'The rate of change is how fast the pressure is moving, not what the number is. A quick drop often tells you more about the weather than the pressure itself.',
      `Each row in the table looks back from the newest reading: ${WINDOWS} hours. It shows how much the pressure changed in that window, and how fast per hour.`,
      'Weather forecasters usually judge pressure by how much it moves in 3 hours, so the labels are based on that pace.',
      'If the table says there is not enough data for a window, that is honest: the file you loaded does not reach back that far.',
    ],
  },
  {
    heading: 'What the labels mean',
    paragraphs: [
      `The labels come from how far the pressure moved over 3 hours. The two numbers that matter are ${SLOW} hPa (about ${SLOW_INHG} inHg) and ${FAST} hPa (about ${FAST_INHG} inHg).`,
    ],
    items: [
      `Falling fast: down ${FAST} hPa or more in 3 hours. A storm or a weather front is often on the way.`,
      `Falling: down between ${SLOW} and ${FAST} hPa in 3 hours. The weather may be changing.`,
      `Steady: less than ${SLOW} hPa of change either way in 3 hours. Expect more of the same.`,
      `Rising: up between ${SLOW} and ${FAST} hPa in 3 hours. Skies often clear up.`,
      `Rising fast: up ${FAST} hPa or more in 3 hours. This often happens right after a storm passes.`,
    ],
  },
  {
    heading: 'Notes',
    paragraphs: [
      'Tap Add note to write down how you feel or what is happening. You can change the time if you are writing about an earlier moment.',
      'The feeling rating is a quick score from 1 to 5, where 1 is a rough moment and 5 is a great one. It is optional.',
      'Writing how you feel next to the pressure helps you spot your own patterns over time. The app only lines up numbers with your words. It does not diagnose anything.',
      'Every note shows up as a small diamond on the chart at its time. Tap a diamond to jump to that note in the list.',
      'Use Export to save all your notes to a file. Use Import to bring them back, or to move them to another device.',
    ],
  },
  {
    heading: 'Looking back in time',
    paragraphs: [
      'Tap anywhere on the chart to place a marker at that moment. The rate table switches to show how the pressure was moving right then.',
      'Drag sideways on the chart to slide the marker. On a computer, just move the mouse across the chart.',
      'Tap anywhere outside the chart, or press the Latest button, to come back to now.',
    ],
  },
  {
    heading: 'Keep your data safe',
    paragraphs: [
      'Everything you see lives on your device. There is no account and no cloud.',
      'A tip for iPhone: Safari can clear the data a website has saved if you have not visited it for a while. To protect your data, tap the Share button and choose Add to Home Screen. Opening the app from that icon keeps your data much safer.',
      'It is also smart to Export your notes once in a while, so you have a backup file.',
      'The app also works in Firefox and Chrome, on Android phones and on desktop computers.',
    ],
  },
];
