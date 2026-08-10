const fs = require('fs');

function replaceAlerts(file) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    if (content.includes('alert(') && !content.includes('toast from \'react-hot-toast\'')) {
        content = content.replace(/(import React.*?;\n)/, '$1import toast from \'react-hot-toast\';\n');
    }

    content = content.replace(/alert\((['"`])(.*?)\1\)/g, (match, quote, msg) => {
        if (msg.includes('successfully') || msg.includes('Congratulations') || msg.includes('✅') || msg.includes('Successfully')) {
            return 'toast.success(' + quote + msg + quote + ')';
        } else {
            return 'toast.error(' + quote + msg + quote + ')';
        }
    });

    content = content.replace(/alert\((['"`].*?['"`] \+ .*?)\)/g, 'toast.error($1)');
    content = content.replace(/alert\((.*? \+ .*?)\)/g, 'toast.error($1)');
    content = content.replace(/return alert\(/g, 'return toast.error(');

    if (original !== content) {
        fs.writeFileSync(file, content);
        console.log('Fixed:', file);
    }
}

['src/App.tsx', 'src/components/propfirm/PropFirmChallenges.tsx', 'src/components/propfirm/PropFirmPayouts.tsx', 'src/components/ResearchTerminal.tsx', 'src/components/TaxCapitalGains.tsx'].forEach(replaceAlerts);
