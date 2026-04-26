interface AvatarCanvasProps {
  mountRef: React.RefObject<HTMLDivElement | null>;
  error?: string;
}

export function AvatarCanvas({ mountRef, error }: AvatarCanvasProps) {
  return (
    <div className="fixed inset-0 z-0">
      <div ref={mountRef} className="h-full w-full bg-[#060a11]" />
      {error ? (
        <div className="absolute inset-0 grid place-items-center text-sm text-red-300 bg-black/50">
          SpatialReal unavailable: {error}
        </div>
      ) : null}
    </div>
  );
}
