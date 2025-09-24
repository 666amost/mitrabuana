export const loader = async () => {
  // Return 204 No Content for favicon requests so dev server doesn't raise a route-missing error.
  return new Response(null, { status: 204 });
};

export default function Favicon() {
  return null;
}
