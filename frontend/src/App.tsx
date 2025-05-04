import { EpubBook } from "./lib/epub";

function App() {

    const onBook = (e: Event)  => {
        const book = (e.target as HTMLInputElement).files?.item(0);
        if (book) {
            EpubBook.fromFile(book).then( b => console.log(b));
        }
    };


    return (
        <>
            <p>Hello World!</p>
            <label for="file-input" class="icon has-text-light">Select file</label>
            <input onInput={onBook} id="file-input" style="display:none;" type="file" accept=".epub" />
        </>
    )
}

export default App
