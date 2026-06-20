const settings = window.wc.wcSettings.getSetting('paymentMethodData').sepay;
const label = window.wp.htmlEntities.decodeEntities(settings.title);

function safeUrl(url) {
    const s = String(url == null ? '' : url).trim();
    if (/^(javascript|data|vbscript):/i.test(s)) return '';
    return s;
}

const Content = () => {
    // settings.description is sanitized server-side via wp_kses_post; keep
    // dangerouslySetInnerHTML to preserve admin-allowed formatting (links, lists).
    return window.wp.element.createElement('div', {
        dangerouslySetInnerHTML: { __html: settings.description || '' }
    });
};

const Block_Gateway = {
    name: 'sepay',
    label: label,
    content: Object(window.wp.element.createElement)(Content, null),
    edit: Object(window.wp.element.createElement)(Content, null),
    canMakePayment: () => true,
    ariaLabel: label,
    supports: {
        features: settings.supports,
    },
};
window.wc.wcBlocksRegistry.registerPaymentMethod(Block_Gateway);

document.addEventListener('DOMContentLoaded', () => {
    if (! settings.logo) {
        return;
    }

    const checkElement = setInterval(() => {
        const element = document.querySelector('#radio-control-wc-payment-method-options-sepay__label');
        if (element) {
            // Build via DOM API so label/logo cannot inject markup or attributes.
            element.textContent = '';
            const wrap = document.createElement('span');
            wrap.style.width = '100%';
            wrap.appendChild(document.createTextNode(label));
            const right = document.createElement('span');
            right.style.float = 'right';
            const img = document.createElement('img');
            img.src = safeUrl(settings.logo);
            img.alt = label;
            right.appendChild(img);
            wrap.appendChild(right);
            element.appendChild(wrap);
            clearInterval(checkElement);
        }
    }, 100);
});
