import ScrollVelocity from "@components/ui/ScrollVelocity";

type Props = { text: string };

export default function LegacyScrollText({ text }: Props) {
  return (
    <ScrollVelocity
      texts={[text]}
      velocity={40}
      numCopies={6}
      className="select-none pr-8 font-display text-5xl font-black italic leading-[1.3] tracking-wide text-brand-green-500 sm:text-7xl sm:tracking-wider xl:text-[140px]"
    />
  );
}
