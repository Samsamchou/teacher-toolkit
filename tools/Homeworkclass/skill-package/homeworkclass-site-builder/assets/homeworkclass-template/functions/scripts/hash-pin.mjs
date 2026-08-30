import bcrypt from "bcryptjs";

const input = process.stdin;
const output = process.stdout;

if (!input.isTTY || typeof input.setRawMode !== "function") {
  console.error(
    "請在互動式終端機執行此工具。 / Run this helper in an interactive terminal.",
  );
  process.exitCode = 1;
} else {
  const readHiddenPin = (label) =>
    new Promise((resolve, reject) => {
      let value = "";
      output.write(label);
      input.setRawMode(true);
      input.resume();
      input.setEncoding("utf8");

      const finish = () => {
        input.off("data", onData);
        input.setRawMode(false);
        output.write("\n");
        resolve(value);
      };

      const onData = (chunk) => {
        for (const character of chunk) {
          if (character === "\u0003") {
            input.off("data", onData);
            input.setRawMode(false);
            output.write("\n");
            reject(new Error("cancelled"));
            return;
          }
          if (character === "\r" || character === "\n") {
            finish();
            return;
          }
          if (character === "\u0008" || character === "\u007f") {
            if (value.length > 0) {
              value = value.slice(0, -1);
              output.write("\b \b");
            }
            continue;
          }
          if (/^[0-9]$/.test(character) && value.length < 6) {
            value += character;
            output.write("*");
          }
        }
      };

      input.on("data", onData);
    });

  try {
    const first = await readHiddenPin("請輸入 6 位數通行碼 / Enter six-digit PIN: ");
    const second = await readHiddenPin("請再次輸入確認 / Enter again to confirm: ");

    if (!/^[0-9]{6}$/.test(first) || first !== second) {
      console.error("格式錯誤或兩次輸入不同。 / Invalid format or PINs do not match.");
      process.exitCode = 1;
    } else {
      const hash = await bcrypt.hash(first, 12);
      console.log("\nTEACHER_PIN_BCRYPT_HASH（請視為秘密）:");
      console.log(hash);
    }
  } catch (error) {
    if (error instanceof Error && error.message !== "cancelled") {
      console.error("無法產生雜湊。 / Could not create the hash.");
    }
    process.exitCode = 1;
  } finally {
    if (input.isTTY) input.setRawMode(false);
    input.pause();
  }
}
