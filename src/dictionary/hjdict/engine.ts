import {
    HTMLString,
    getInnerHTML,
    handleNetWorkError,
    SearchFunction,
    GetSrcPageFunction,
    DictSearchResult,
    fetchDirtyDOM,
    getStaticSpeaker,
} from '../helpers';

export const getSrcPage: GetSrcPageFunction = (text) => {
    return `https://www.dict.hujiang.com/${"w"}/${encodeURIComponent(text)}`;
};

const HOST = 'https://www.hjdict.com';

export interface HjdictResultLex {
    type: 'lex';
    langCode: string;
    header?: HTMLString;
    entries: HTMLString[];
}

export interface HjdictResultRelated {
    type: 'related';
    langCode: string;
    content: HTMLString;
}

export type HjdictResult = HjdictResultLex | HjdictResultRelated;

type HjdictSearchResult = DictSearchResult<HjdictResult>;

interface HjdictPayload {
    langCode?: string;
}

export const search: SearchFunction<HjdictResult> = async (
    text: string,
    config,
    // profile,
    // payload
) => {
    const cookies: { [K in string]: any } = {
        HJ_SITEID: 3,
        HJ_UID: getUUID(),
        HJ_SID: getUUID(),
        HJ_SSID: getUUID(),
        HJID: 0,
        HJ_VT: 2,
        HJ_SST: 1,
        HJ_CSST: 1,
        HJ_ST: 1,
        HJ_CST: 1,
        HJ_T: +new Date(),
        _: getUUID(16)
    };

    const langCode = langMap[config.lang as keyof typeof langMap];
    return fetchDirtyDOM(
        `https://dict.hujiang.com/${langCode}/${encodeURIComponent(text)}`,
        { cookies }
    )
        .catch(handleNetWorkError)
        .then(doc => handleDOM(doc, langCode));
};

function handleDOM(
    doc: DocumentFragment,
    langCode: string
): HjdictSearchResult | Promise<HjdictSearchResult> {
    if (doc.querySelector('.word-notfound')) {
        return wrapNoResult(langCode);
    }

    const $suggests = doc.querySelector('.word-suggestions');
    if ($suggests) {
        return {
            result: {
                type: 'related',
                langCode,
                content: getInnerHTML(HOST, $suggests)
            }
        };
        // return wrapNoResult(langCode)
    }

    let header = '';
    const $header = doc.querySelector('.word-details-multi .word-details-header');
    if ($header) {
        $header
            .querySelectorAll<HTMLLIElement>('.word-details-tab')
            .forEach(($tab, i) => {
                $tab.dataset.categories = String(i);
            });
        header = getInnerHTML(HOST, $header);
    }

    doc.querySelectorAll<HTMLSpanElement>('.word-audio').forEach($audio => {
        $audio.replaceWith(getStaticSpeaker($audio.dataset.src));
    });

    const entries: HTMLString[] = [
        ...doc.querySelectorAll('.word-details-pane')
    ].map(
        ($pane, i) => `
        <div class="word-details-pane${i === 0 ? ' word-details-pane-active' : ''
            }">
          <div class="word-details-pane-header">
            ${getInnerHTML(HOST, $pane, '.word-details-pane-header')}
          </div>
          <div class="word-details-pane-content">
            ${getInnerHTML(HOST, $pane, '.word-details-pane-content')}
          </div>
        </div>
      `
    );

    return entries.length > 0
        ? { result: { type: 'lex', header, entries, langCode } }
        : wrapNoResult(langCode);
}

function wrapNoResult(langCode: string): DictSearchResult<HjdictResultRelated> {
    return {
        result: {
            type: 'related',
            langCode,
            content: '<p style="text-align:center;">No Result</p>'
        }
    };
}

const langMap = {
    en: "w",
    jp: "jp/jc",
    kr: "kr",
    fr: "fr",
    de: "de",
    es: "es"
};

function getUUID(e?: number): string {
    let t = arguments.length > 1 && undefined !== arguments[1] ? arguments[1] : 16;
    let n = '';
    if ('number' === typeof e) {
        for (let i = 0; i < e; i++) {
            const r = Math.floor(10 * Math.random());
            n += r % 2 === 0 ? 'x' : 'y';
        }
    } else {
        n = e || 'xxxxxxxx-xyxx-yxxx-xxxy-xxyxxxxxxxxx';
    }
    return (
        ('number' !== typeof t || t < 2 || t > 36) && (t = 16),
        n.replace(/[xy]/g, function (e) {
            const n = (Math.random() * t) | 0;
            return ('x' === e ? n : (3 & n) | 8).toString(t);
        })
    );
}
