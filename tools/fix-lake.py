from pathlib import Path
p = Path(r'D:\桌面\田园小镇\godot\scripts\main.gd')
t = p.read_text(encoding='utf-8')
t = t.replace('if type == "fish" and not unlocked.river:', 'if type == "fish" and not unlocked.lake:')
t = t.replace('if not unlocked.river:', 'if not unlocked.lake:')
p.write_text(t, encoding='utf-8')
print('patched lake checks')
