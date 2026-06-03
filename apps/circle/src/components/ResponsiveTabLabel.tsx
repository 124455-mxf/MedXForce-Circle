type ResponsiveTabLabelProps = {
  long: string;
  compact: string;
};

export function ResponsiveTabLabel({ long, compact }: ResponsiveTabLabelProps) {
  return (
    <>
      <span className="[@media(max-height:740px)]:hidden">{long}</span>
      <span className="hidden [@media(max-height:740px)]:inline">{compact}</span>
    </>
  );
}
