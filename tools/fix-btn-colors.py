from pathlib import Path
p = Path(r'D:\桌面\田园小镇\godot\scripts\main.gd')
t = p.read_text(encoding='utf-8')
old = '\tb.add_theme_color_override("font_color", Color("#4a3524"))\n\n\nfunc _chip'
new = ('\tb.add_theme_color_override("font_color", Color("#4a3524"))\n'
       '\tb.add_theme_color_override("font_hover_color", Color("#4a3524"))\n'
       '\tb.add_theme_color_override("font_pressed_color", Color("#3a2a18"))\n'
       '\tb.add_theme_color_override("font_focus_color", Color("#4a3524"))\n'
       '\tb.add_theme_color_override("font_disabled_color", Color("#9a8a6a"))\n\n\nfunc _chip')
if old in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('patched')
else:
    print('marker not found; dumping tail of _style_button')
    i = t.index('func _style_button')
    print(t[i:i+700])
