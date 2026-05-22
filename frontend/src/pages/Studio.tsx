import { CameraStudio } from "@/components/CameraStudio";

export default function StudioPage() {
  return (
    <div className="lg:mx-auto lg:max-w-6xl lg:px-6 lg:py-10">
      <div className="mb-8 hidden lg:block">
        <h1 className="font-serif text-4xl text-chestnut">Studio</h1>
        <p className="mt-1 text-brown-medium">
          Show your room. Talk to the stylist. Save the looks you love.
        </p>
      </div>
      <CameraStudio />
    </div>
  );
}
