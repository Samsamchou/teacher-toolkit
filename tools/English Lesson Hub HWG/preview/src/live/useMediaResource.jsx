import { useEffect, useState } from "react";
import { assetUrl } from "./media.mjs";
import { activeRoomCode } from "./transport.mjs";
export function useMediaResource(id) {
  const [value, setValue] = useState({ url: "", error: "" }),
    [revision, setRevision] = useState(0);
  const room = activeRoomCode();
  useEffect(() => {
    let active = true,
      current = "",
      timer;
    setValue({ url: "", error: "" });
    async function load() {
      try {
        const url = id ? await assetUrl(id) : "";
        if (!active) {
          if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
          return;
        }
        if (current.startsWith("blob:")) URL.revokeObjectURL(current);
        current = url || "";
        setValue({ url: current, error: current ? "" : "素材尚未下載。" });
      } catch (e) {
        if (active) setValue({ url: "", error: e.message });
      }
      if (active && id?.startsWith("cloud-"))
        timer = setTimeout(load, current ? 8 * 60000 : 10000);
    }
    load();
    return () => {
      active = false;
      clearTimeout(timer);
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
    };
  }, [id, room, revision]);
  return { ...value, refresh: () => setRevision((v) => v + 1) };
}
