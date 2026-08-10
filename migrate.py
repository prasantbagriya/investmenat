import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add react-router-dom import
if 'react-router-dom' not in content:
    content = content.replace('import React, { useState, useEffect, useMemo } from \'react\';', 'import React, { useState, useEffect, useMemo } from \'react\';\nimport { Routes, Route, Navigate, useNavigate, useLocation } from \'react-router-dom\';')

# Replace useState for activeTab
content = re.sub(
    r'const \[activeTab, setActiveTab\] = useState<string>\(.*?\'dashboard\'\s*\);',
    'const navigate = useNavigate();\n  const location = useLocation();\n  const activeTab = location.pathname.split(\'/\')[1] || (currentWorkspace === \'ledger\' ? \'dashboard\' : \'portfolio\');\n  const setActiveTab = (tab: string) => navigate(`/${tab}`);',
    content,
    flags=re.DOTALL
)

# Convert activeTab conditionals to Routes
route_pattern = r'\{\s*activeTab\s*===\s*\'(.*?)\'\s*&&\s*\((.*?)\)\s*\}'
def route_repl(match):
    path = match.group(1)
    element = match.group(2).strip()
    return f'<Route path=\"/{path}\" element={{{element}}} />'

# Find the main div inside <main>
main_start = content.find('<main className=\"max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 mt-3 w-full flex-grow\">')
main_end = content.find('</main>', main_start)
main_content = content[main_start:main_end]

# Extract routes and replace
routes_replaced = re.sub(route_pattern, route_repl, main_content, flags=re.DOTALL)

# Wrap in <Routes>
start_div_idx = routes_replaced.find('<div className=\"transition-all duration-300\">')
end_div_idx = routes_replaced.rfind('</div>')

if start_div_idx != -1 and end_div_idx != -1:
    inner = routes_replaced[start_div_idx + len('<div className=\"transition-all duration-300\">'):end_div_idx].strip()
    wrapped = '<div className=\"transition-all duration-300\">\n          <Routes>\n            <Route path=\"/\" element={<Navigate to={currentWorkspace === \'ledger\' ? \'/dashboard\' : \'/portfolio\'} replace />} />\n            ' + inner + '\n            <Route path=\"*\" element={<Navigate to=\"/\" replace />} />\n          </Routes>\n        </div>'
    routes_replaced = routes_replaced[:start_div_idx] + wrapped + routes_replaced[end_div_idx + 6:]

content = content[:main_start] + routes_replaced + content[main_end:]

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Migration to React Router complete.')
