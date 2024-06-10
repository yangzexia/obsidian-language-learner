import {
    HTMLString,
    getText,
    getInnerHTML,
    handleNoResult,
    handleNetWorkError,
    SearchFunction,
    GetSrcPageFunction,
    removeChildren,
    fetchDirtyDOM,
    DictSearchResult
} from '../helpers';

export type JukuuLang = 'engjp' | 'zhjp' | 'zheng';

function getUrl(text: string, lang: JukuuLang) {
    text = encodeURIComponent(text.replace(/\s+/g, '+'));

    switch (lang) {
        case 'engjp':
            return 'http://www.jukuu.com/jsearch.php?q=' + text;
        case 'zhjp':
            return 'http://www.jukuu.com/jcsearch.php?q=' + text;
        // case 'zheng':
        default:
            return 'http://www.jukuu.com/search.php?q=' + text;
    }
}

export const getSrcPage: GetSrcPageFunction = (text) => {
    return getUrl(text, "zheng");
};

interface JukuuTransItem {
    trans: HTMLString;
    original: string;
    src: string;
}

export interface JukuuResult {
    lang: JukuuLang;
    sens: JukuuTransItem[];
}

export interface JukuuPayload {
    lang?: JukuuLang;
}

type JukuuSearchResult = DictSearchResult<JukuuResult>;

export const search: SearchFunction<JukuuResult> = (
    text: string,
) => {
    const lang = "zheng";
    return fetchDirtyDOM(getSrcPage(text))
        .catch(handleNetWorkError)
        .then(handleDOM)
        .then(sens =>
            sens.length > 0 ? { result: { lang, sens } } : handleNoResult()
        );
};

function handleDOM(doc: DocumentFragment): JukuuTransItem[] {
    return [...doc.querySelectorAll('tr.e')]
        .map($e => {
            const $trans = $e.lastElementChild;
            if (!$trans) {
                return;
            }
            removeChildren($trans, 'img');

            const $original = $e.nextElementSibling;
            if (!$original || !$original.classList.contains('c')) {
                return;
            }

            const $src = $original.nextElementSibling;

            return {
                trans: getInnerHTML('http://www.jukuu.com', $trans),
                original: getText($original),
                src:
                    $src && $src.classList.contains('s')
                        ? getText($src).replace(/^[\s-]*/, '')
                        : ''
            };
        })
        .filter((item): item is JukuuTransItem => Boolean(item && item.trans));
}
