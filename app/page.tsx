// Shell landing surface (S1). The full home (hero, category cards, rails) is S6.
export default function HomePage() {
  return (
    <>
      <h1 className="text-2xl font-bold sm:text-3xl">Amazon Rebuild</h1>
      <p className="mt-3 max-w-prose text-base">
        The application shell is in place: header, search, menu, navigation and footer. Search, product pages, cart and
        checkout arrive in the next slices.
      </p>
    </>
  );
}
