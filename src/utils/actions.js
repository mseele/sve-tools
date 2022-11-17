function validateEmail(email) {
  const re =
    /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
  return re.test(String(email).toLowerCase())
}

function replace(content, person) {
  return content
    .replace(/\{\{firstname\}\}/gi, person.firstName.trim())
    .replace(/\{\{lastname\}\}/gi, person.lastName.trim())
}

function readFile(inputFile) {
  const reader = new FileReader()

  return new Promise((resolve, reject) => {
    reader.onerror = () => {
      reader.abort()
      reject(new DOMException('Error reading file: ' + reader.error))
    }

    reader.onload = () => {
      var dataUrl = reader.result
      var base64 = dataUrl.split(',')[1]
      resolve(base64)
    }
    reader.readAsDataURL(inputFile)
  })
}

export { validateEmail, replace, readFile }
