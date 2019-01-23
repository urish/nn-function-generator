const spinner = document.querySelector('#spinner');
const resultDiv = document.querySelector('#result');

async function submitSignature(signature) {
  spinner.removeAttribute('hidden');
  resultDiv.setAttribute('hidden', 'hidden');
  const response = await fetch('/predict?signature=' + encodeURIComponent(signature));
  const { result } = await response.json();
  spinner.setAttribute('hidden', 'hidden');
  resultDiv.removeAttribute('hidden');
  resultDiv.textContent = result;
}
