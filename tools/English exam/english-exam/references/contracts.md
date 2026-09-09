# 結構檢查工具 / Plan checks

Python 3.11+，只用標準庫，沒有網路呼叫。執行 `python scripts/exam_check.py <plan.json>`；正式交付關卡加 `--release`。本工具只檢查聲明，不獨立證明來源、語意或教師驗收。

exam-plan須含mode（listening或reading_writing）、total_points、bloom_points及items。每題需id、points、bloom、reason、source、source_status、answer，選擇題有options。source_status合法值verified_for_item或teacher_resolved，必須有實際依據。待核對來源保留其他狀態並接受檢查不通過，不偽造驗收。

聽力另有events，事件需唯一event_id及kind=speech或silence。speech填text、voice及相關item_id；silence填pause_seconds。尚未選定真實聲音可在草稿以角色代號表示，但不能因此直接製音。

phonics_target題可填expected_readings、male_then_female；對話speech填dialogue_id、role、repeat，dialogue_repeats宣告次數。旁白role=narrator不計為第三對話聲音。

release需要approvals中的spec、text、paper_visual_qa、teacher_paper；聽力再加audio_technical_qa、audio_content_qa、teacher_audio。只有有外部確認證據才可true。

examples有完整自製小例。source_status只代表例題可從自製來源求解，approvals留空，release應失敗。工具不檢查語音實際內容、不渲染Word、不驗證全部教材頁。
