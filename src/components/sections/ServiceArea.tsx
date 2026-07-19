import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { business, serviceAreaCities } from "@data/site";
import Map from "./service-map/Map";

export default function ServiceArea() {
  const [query, setQuery] = useState("");

  const filteredCities = useMemo(() => {
    if (!query.trim()) return serviceAreaCities;
    return serviceAreaCities.filter((city) =>
      city.toLowerCase().includes(query.trim().toLowerCase()),
    );
  }, [query]);

  const isFiltering = query.trim().length > 0;
  const visibleCities = isFiltering ? filteredCities : filteredCities.slice(0, 10);

  return (
    <div className="flex flex-col gap-10">
      <div className="relative mx-auto w-full max-w-md">
        <label htmlFor="city-search" className="sr-only">
          Search your city
        </label>
        <input
          id="city-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your city..."
          className="w-full rounded-full border border-navy-200 bg-white py-3.5 pl-5 pr-12 text-navy-800 shadow-sm outline-none transition-colors placeholder:text-navy-300 focus:border-brand-green-500"
        />
        <Search className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-300" aria-hidden="true" />
      </div>

      <Map />

      {/* Desktop (xl, where the container is a constant 1160px): force a single
          no-wrap row and tighten the gap so all city chips fit without
          overflowing. Below xl it keeps wrapping naturally. The full list lives
          behind the "See Full Service Area" link below. */}
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 xl:flex-nowrap xl:gap-1.5">
        {filteredCities.length > 0 ? (
          <>
            {visibleCities.map((city) => (
              <a
                key={city}
                href={`/service-area#${city.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-full bg-navy-800 px-2 text-center text-xs font-medium leading-tight text-white transition-colors hover:bg-navy-700 max-sm:flex max-sm:h-12 max-sm:w-full max-sm:items-center max-sm:justify-center sm:px-5 sm:py-3 sm:text-sm"
              >
                {city}
              </a>
            ))}
            {/* Mobile: the link rides in the grid's last row, filling the empty
                cells beside the final chip. sm+ uses the centred link below. */}
            <a
              href="/service-area"
              className="col-span-2 hidden items-center justify-center gap-1 font-semibold text-navy-700 hover:text-brand-green-600 max-sm:flex"
            >
              See Full Service Area →
            </a>
          </>
        ) : (
          <p className="text-sm text-navy-400 max-sm:col-span-3">
            We couldn't find that city - call us at{" "}
            <a href={business.phoneHref} className="font-semibold text-navy-700 underline">
              {business.phone}
            </a>
            , we likely still serve your area.
          </p>
        )}
      </div>

      <div className="text-center max-sm:hidden">
        <a href="/service-area" className="inline-flex items-center gap-1 font-semibold text-navy-700 hover:text-brand-green-600">
          See Full Service Area →
        </a>
      </div>
    </div>
  );
}
