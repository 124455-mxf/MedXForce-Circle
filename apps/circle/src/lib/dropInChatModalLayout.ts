/** Keep in sync with medxforce/src/lib/dropInChatModalLayout.ts */

export const DROP_IN_CHAT_BACKDROP_CLASS =
  'fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4 sm:p-5 md:p-6 lg:p-10';

export const DROP_IN_CHAT_PANEL_CLASS = [
  'bg-white w-full flex flex-col overflow-hidden rounded-[28px] shadow-2xl border border-slate-100',
  'max-w-[min(calc(100vw-2rem),32rem)]',
  'h-[min(88vh,640px)]',
  'max-h-[min(88vh,640px)]',
  'sm:max-w-[min(calc(100vw-3rem),40rem)]',
  'sm:h-[min(86vh,680px)]',
  'sm:max-h-[min(86vh,680px)]',
  'md:max-w-[min(calc(100vw-4rem),44rem)]',
  'lg:max-w-[min(calc(100vw-6rem),52rem)]',
  'lg:h-[min(80vh,760px)]',
  'lg:max-h-[min(80vh,760px)]',
  '[@media(orientation:landscape)_and_(max-height:820px)]:h-[min(94vh,600px)]',
  '[@media(orientation:landscape)_and_(max-height:820px)]:max-h-[min(94vh,600px)]',
  '[@media(orientation:portrait)_and_(min-height:1000px)]:h-[min(68vh,780px)]',
  '[@media(orientation:portrait)_and_(min-height:1000px)]:max-h-[min(68vh,780px)]',
].join(' ');

export const DROP_IN_CHAT_HEADER_CLASS =
  'flex items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5 [@media(max-height:740px)]:p-3.5';

export const DROP_IN_CHAT_BODY_CLASS =
  'flex-1 min-h-[10rem] sm:min-h-[12rem] overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/70 [@media(max-height:740px)]:p-3.5';

export const DROP_IN_CHAT_FOOTER_CLASS =
  'border-t border-slate-100 space-y-3 p-4 sm:p-5 [@media(max-height:740px)]:space-y-2 [@media(max-height:740px)]:p-3.5';

export const DROP_IN_CHAT_TEXTAREA_CLASS =
  'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl resize-none text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15 [@media(max-height:740px)]:py-2.5 [@media(max-height:740px)]:min-h-[4.5rem]';
