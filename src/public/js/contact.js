if (location.pathname === "/lien-he") {
  const form = document.querySelector("#contactForm");
  const status = document.querySelector("#contactStatus");
  const submitLabel = document.querySelector(".contact-submit-label");
  const phonePattern = /^(?:\+?84|0)(?:\d[\s.-]?){8,10}$/;

  const showError = (field, message) => {
    field.classList.toggle("invalid", Boolean(message));
    field.setAttribute("aria-invalid", String(Boolean(message)));
    const error = field.closest("label")?.querySelector(".field-error");
    if (error) error.textContent = message;
  };

  const validate = () => {
    let valid = true;
    const name = form.elements.name;
    const phone = form.elements.phone;
    const email = form.elements.email;
    const subject = form.elements.subject;
    const message = form.elements.message;
    const consent = form.elements.consent;

    const rules = [
      [name, name.value.trim().length >= 2 ? "" : "Vui lòng nhập họ và tên."],
      [
        phone,
        phonePattern.test(phone.value.trim())
          ? ""
          : "Số điện thoại chưa đúng định dạng.",
      ],
      [
        email,
        !email.value.trim() || email.validity.valid
          ? ""
          : "Email chưa đúng định dạng.",
      ],
      [subject, subject.value ? "" : "Vui lòng chọn chủ đề."],
      [
        message,
        message.value.trim().length >= 10
          ? ""
          : "Nội dung cần có ít nhất 10 ký tự.",
      ],
    ];

    rules.forEach(([field, error]) => {
      showError(field, error);
      if (error) valid = false;
    });

    document.querySelector(".consent-error").textContent = consent.checked
      ? ""
      : "Bạn cần đồng ý để chúng tôi có thể liên hệ lại.";
    if (!consent.checked) valid = false;

    return valid;
  };

  form.addEventListener("input", (event) => {
    if (event.target.matches("input, textarea, select")) {
      showError(event.target, "");
      if (event.target.name === "consent") {
        document.querySelector(".consent-error").textContent = "";
      }
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    status.className = "";
    status.textContent = "";

    if (!validate()) {
      status.className = "error";
      status.textContent = "Vui lòng kiểm tra lại các thông tin được đánh dấu.";
      form.querySelector(".invalid")?.focus();
      return;
    }

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submitLabel.textContent = "Đang gửi…";

    window.setTimeout(() => {
      const customerName = form.elements.name.value.trim();
      form.reset();
      submit.disabled = false;
      submitLabel.textContent = "Gửi lời nhắn";
      status.className = "success";
      status.textContent = `Cảm ơn ${customerName}! Nông Sản Xanh đã nhận được lời nhắn và sẽ liên hệ lại sớm.`;
    }, 500);
  });
}
