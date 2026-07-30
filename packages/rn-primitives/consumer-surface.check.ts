// Consumer-surface typecheck fixture. Imports every public subpath through the
// package's OWN exports map (Node/TS self-reference by package name), so this
// file fails if an entry is missing, mistyped, or points at a declaration that
// does not resolve. Not shipped — `files` limits the tarball to dist/.

import type * as Accordion from '@weavr/rn-primitives/accordion';
import type * as AlertDialog from '@weavr/rn-primitives/alert-dialog';
import type * as AspectRatio from '@weavr/rn-primitives/aspect-ratio';
import type * as Avatar from '@weavr/rn-primitives/avatar';
import type * as Checkbox from '@weavr/rn-primitives/checkbox';
import type * as Collapsible from '@weavr/rn-primitives/collapsible';
import type * as ContextMenu from '@weavr/rn-primitives/context-menu';
import type * as Dialog from '@weavr/rn-primitives/dialog';
import type * as DropdownMenu from '@weavr/rn-primitives/dropdown-menu';
import type * as Hooks from '@weavr/rn-primitives/hooks';
import type * as HoverCard from '@weavr/rn-primitives/hover-card';
import type * as Label from '@weavr/rn-primitives/label';
import type * as Menubar from '@weavr/rn-primitives/menubar';
import type * as NavigationMenu from '@weavr/rn-primitives/navigation-menu';
import type * as Popover from '@weavr/rn-primitives/popover';
import type * as Portal from '@weavr/rn-primitives/portal';
import type * as Progress from '@weavr/rn-primitives/progress';
import type * as RadioGroup from '@weavr/rn-primitives/radio-group';
import type * as Select from '@weavr/rn-primitives/select';
import type * as Separator from '@weavr/rn-primitives/separator';
import type * as Slider from '@weavr/rn-primitives/slider';
import type * as Slot from '@weavr/rn-primitives/slot';
import type * as Switch from '@weavr/rn-primitives/switch';
import type * as Table from '@weavr/rn-primitives/table';
import type * as Tabs from '@weavr/rn-primitives/tabs';
import type * as Toast from '@weavr/rn-primitives/toast';
import type * as Toggle from '@weavr/rn-primitives/toggle';
import type * as ToggleGroup from '@weavr/rn-primitives/toggle-group';
import type * as Toolbar from '@weavr/rn-primitives/toolbar';
import type * as Tooltip from '@weavr/rn-primitives/tooltip';
import type * as Types from '@weavr/rn-primitives/types';
import type * as Utils from '@weavr/rn-primitives/utils';

export type PublicSurface = {
  'accordion': typeof Accordion;
  'alert-dialog': typeof AlertDialog;
  'aspect-ratio': typeof AspectRatio;
  'avatar': typeof Avatar;
  'checkbox': typeof Checkbox;
  'collapsible': typeof Collapsible;
  'context-menu': typeof ContextMenu;
  'dialog': typeof Dialog;
  'dropdown-menu': typeof DropdownMenu;
  'hooks': typeof Hooks;
  'hover-card': typeof HoverCard;
  'label': typeof Label;
  'menubar': typeof Menubar;
  'navigation-menu': typeof NavigationMenu;
  'popover': typeof Popover;
  'portal': typeof Portal;
  'progress': typeof Progress;
  'radio-group': typeof RadioGroup;
  'select': typeof Select;
  'separator': typeof Separator;
  'slider': typeof Slider;
  'slot': typeof Slot;
  'switch': typeof Switch;
  'table': typeof Table;
  'tabs': typeof Tabs;
  'toast': typeof Toast;
  'toggle': typeof Toggle;
  'toggle-group': typeof ToggleGroup;
  'toolbar': typeof Toolbar;
  'tooltip': typeof Tooltip;
  'types': typeof Types;
  'utils': typeof Utils;
};
