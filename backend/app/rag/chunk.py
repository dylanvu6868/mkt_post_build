from langchain.text_splitter import RecursiveCharacterTextSplitter

_SEPARATORS = ["\n\n\n", "\n\n", "\n", ". ", "!\n", "?\n", "。", ".\n", ", ", " ", ""]

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=150,
    separators=_SEPARATORS,
    length_function=len,
)


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> list[str]:
    text = text.strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]
    splitter = _splitter
    if chunk_size != 800 or overlap != 150:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap,
            separators=_SEPARATORS,
            length_function=len,
        )
    return splitter.split_text(text)
