import Image from "next/image";

export type TeamFlagData = {
  name: string;
  short_name: string;
  flag_emoji?: string | null;
  flag_url?: string | null;
};

type TeamFlagProps = {
  team?: TeamFlagData | null;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-10 w-10 text-xl",
  md: "h-[3.25rem] w-[3.25rem] text-2xl",
  lg: "h-16 w-16 text-3xl",
};

const imageSizes = {
  sm: 40,
  md: 52,
  lg: 64,
};

export function TeamFlag({ team, size = "md" }: TeamFlagProps) {
  if (team?.flag_url) {
    return (
      <div
        className={`country-flag-badge overflow-hidden ${sizeClasses[size]}`}
      >
        <Image
          src={team.flag_url}
          alt={`${team.name} flag`}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`country-flag-badge ${sizeClasses[size]}`}>
      <span>{team?.flag_emoji || "🏳️"}</span>
    </div>
  );
}