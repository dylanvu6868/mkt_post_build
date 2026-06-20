jQuery(document).ready(function () {
  let setupWebhookTimeout;

  jQuery(".wc-sepay-account-list").on(
    "change",
    'input[name="bank_account_id"]',
    function () {
      const selectedAccountId = jQuery(this).val();
      const bankShortName = jQuery(this).data("bank-short-name");
      const subAccountContainer = jQuery(".wc-sepay-sub-account-list");
      const subAccountList = jQuery("#wc-sepay-sub-account-container");
      const loadingSpinner = jQuery(".loading-spinner");
      const submitButton = jQuery(".button-primary");

      if (setupWebhookTimeout) {
        clearTimeout(setupWebhookTimeout);
      }

      subAccountContainer.hide();
      subAccountList.empty();
      submitButton.prop("disabled", true);

      if (selectedAccountId) {
        loadingSpinner.show();

        const excludedSubAccountBanks = ["TPBank", "VPBank", "VietinBank"];
        const requiredSubAccountBanks = ["BIDV", "MSB", "KienLongBank", "OCB"];
        const requiresSubAccount =
          requiredSubAccountBanks.includes(bankShortName) &&
          !excludedSubAccountBanks.includes(bankShortName);

        if (requiresSubAccount) {
          subAccountContainer.show();
        } else {
          submitButton.prop("disabled", false);
        }

        setupWebhookTimeout = setTimeout(function () {
          jQuery.ajax({
            url: ajaxurl,
            method: "POST",
            data: {
              action: "sepay_get_bank_sub_accounts",
              bank_account_id: selectedAccountId,
              _wpnonce: sepay_admin_vars.nonce,
            },
            success: function (response) {
              subAccountList.empty();
              loadingSpinner.hide();

              if (
                response.success &&
                response.data &&
                response.data.length > 0
              ) {
                if (requiresSubAccount) {
                  response.data.forEach(function (subAccount) {
                    const $label = jQuery('<label class="wc-sepay-sub-account-item">');
                    const $input = jQuery('<input type="radio" name="sub_account">')
                      .val(subAccount.account_number);
                    const $details = jQuery('<div class="wc-sepay-sub-account-details">');
                    const $holder = jQuery('<div class="wc-sepay-sub-account-holder">')
                      .text(subAccount.account_holder_name);
                    const $number = jQuery('<div class="wc-sepay-sub-account-number">')
                      .text(subAccount.account_number);
                    $details.append($holder).append($number);
                    $label.append($input).append($details);
                    subAccountList.append($label);
                  });
                  subAccountContainer.show();
                }
              } else if (requiresSubAccount) {
                subAccountContainer.show();
                const $msg = jQuery("<span>").text(
                  "Vui lòng thêm tài khoản VA cho tài khoản ngân hàng " +
                    bankShortName +
                    " trên trang quản lý ",
                );
                const $link = jQuery('<a target="_blank">')
                  .attr(
                    "href",
                    "https://my.sepay.vn/bankaccount/details/" +
                      encodeURIComponent(selectedAccountId),
                  )
                  .text("tài khoản ngân hàng của SePay");
                const $tail = jQuery("<span>").text(" trước khi tiếp tục.");
                subAccountList.append($msg).append($link).append($tail);
              }
            },
            error: function () {
              loadingSpinner.hide();
              if (requiresSubAccount) {
                subAccountContainer.show();
                subAccountList.append(
                  "<p>Đã xảy ra lỗi khi tải tài khoản ảo. Vui lòng thử lại.</p>",
                );
              }
            },
          });
        }, 300);
      } else {
        submitButton.prop("disabled", false);
      }
    },
  );

  jQuery(".wc-sepay-sub-account-list").on(
    "change",
    'input[name="sub_account"]',
    function () {
      jQuery(".button-primary").prop("disabled", false);
    },
  );

  jQuery("#complete-setup").on("click", function (e) {
    e.preventDefault();

    const selectBankAccountEl = jQuery('input[name="bank_account_id"]:checked');
    const selectedBankAccount = selectBankAccountEl.val();
    const selectedSubAccount = jQuery(
      'input[name="sub_account"]:checked',
    ).val();
    const submitButton = jQuery(this);

    if (!selectedBankAccount) {
      return;
    }

    submitButton.prop("disabled", true).text("Đang xử lý...");

    jQuery.ajax({
      url: ajaxurl,
      method: "POST",
      data: {
        action: "setup_sepay_webhook",
        bank_account_id: selectedBankAccount,
        sub_account: selectedSubAccount,
        _wpnonce: jQuery("#sepay_webhook_setup_nonce").val(),
      },
      success: function (response) {
        if (response.success) {
          window.location.reload();
        } else {
          submitButton.prop("disabled", false).text("Hoàn tất thiết lập");
          alert(response.data.message);
        }
      },
      error: function () {
        submitButton.prop("disabled", false).text("Hoàn tất thiết lập");
      },
    });
  });

  const subAccountField = jQuery(".dynamic-sub-account");
  const bankAccountField = jQuery(".sepay-bank-account");
  const payCodePrefixField = jQuery(".sepay-pay-code-prefix");
  const loadingMessage =
    '<option value="">Đang tải danh sách tài khoản ảo...</option>';
  let isFetchingBankAccounts = false;
  let isFetchingPayCodePrefixes = false;

  bankAccountField.on("mousedown", function (e) {
    if (this.hasAttribute("size") || isFetchingBankAccounts) return;

    isFetchingBankAccounts = true;

    jQuery.ajax({
      url: ajaxurl,
      method: "POST",
      data: {
        action: "sepay_get_bank_accounts",
        _wpnonce: sepay_admin_vars.nonce,
      },
      success: function (response) {
        // Capture current value right before replacing HTML
        // This preserves any selection the user made while waiting
        const currentVal = bankAccountField.val();

        bankAccountField.empty();
        if (response.success && response.data.length > 0) {
          response.data.forEach(function (bankAccount) {
            const label = bankAccount.bank.brand_name + ' - ' + bankAccount.account_number + ' - ' + bankAccount.account_holder_name;
            jQuery('<option>').val(bankAccount.id).text(label).appendTo(bankAccountField);
          });
        } else {
          jQuery('<option>').val('').text('-- Chọn tài khoản ảo --').appendTo(bankAccountField);
        }
        bankAccountField.val(currentVal);
      },
      complete: function () {
        isFetchingBankAccounts = false;
      },
    });
  });

  payCodePrefixField.on("mousedown", function (e) {
    if (this.hasAttribute("size") || isFetchingPayCodePrefixes) return;

    isFetchingPayCodePrefixes = true;

    jQuery.ajax({
      url: ajaxurl,
      method: "POST",
      data: {
        action: "sepay_get_pay_code_prefixes",
        _wpnonce: sepay_admin_vars.nonce,
      },
      success: function (response) {
        if (response.success && response.data.length > 0) {
          const currentVal = payCodePrefixField.val();

          payCodePrefixField.empty();
          response.data.forEach(function (payCodePrefix) {
            jQuery('<option>').val(payCodePrefix.prefix).text(payCodePrefix.prefix).appendTo(payCodePrefixField);
          });
          payCodePrefixField.val(currentVal);
        }
      },
      complete: function () {
        isFetchingPayCodePrefixes = false;
      },
    });
  });

  let subAccountTimeout;

  bankAccountField.on("change", function () {
    const selectedBankAccountId = jQuery(this).val();
    const selectedOption = jQuery(this).find("option:selected");
    const bankName = selectedOption.text().split(" - ")[0];
    const currentSubAccountValue = subAccountField.val();

    if (subAccountTimeout) {
      clearTimeout(subAccountTimeout);
    }

    if (!selectedBankAccountId) {
      subAccountField.html(
        '<option value="">Vui lòng chọn tài khoản ngân hàng trước</option>',
      );
      subAccountField.prop("disabled", true);
      return;
    }

    const excludedSubAccountBanks = ["TPBank", "VPBank", "VietinBank"];
    const requiredSubAccountBanks = ["BIDV", "MSB", "KienLongBank", "OCB"];

    if (excludedSubAccountBanks.includes(bankName)) {
      subAccountField.html(
        '<option value="">Ngân hàng ' +
          bankName +
          " không hỗ trợ tài khoản VA</option>",
      );
      subAccountField.prop("disabled", true);
      return;
    }

    subAccountField.prop("disabled", false);
    subAccountField.html(loadingMessage);

    subAccountTimeout = setTimeout(function () {
      jQuery.ajax({
        url: ajaxurl,
        method: "POST",
        data: {
          action: "sepay_get_bank_sub_accounts",
          bank_account_id: selectedBankAccountId,
          _wpnonce: sepay_admin_vars.nonce,
        },
        success: function (response) {
          subAccountField.empty();
          if (response.success && response.data.length > 0) {
            jQuery('<option>').val('').text('-- Chọn tài khoản ảo --').appendTo(subAccountField);
            response.data.forEach(function (subAccount) {
              const label = subAccount.account_number + (subAccount.label ? ' - ' + subAccount.label : '');
              jQuery('<option>').val(subAccount.account_number).text(label).appendTo(subAccountField);
            });
          } else {
            jQuery('<option>').val('').text('Không có tài khoản VA nào').appendTo(subAccountField);
          }

          if (
            currentSubAccountValue &&
            response.success &&
            response.data.length > 0
          ) {
            const subAccountExists = response.data.some(function (subAccount) {
              return subAccount.account_number === currentSubAccountValue;
            });
            if (subAccountExists) {
              subAccountField.val(currentSubAccountValue);
            }
          }
        },
        error: function () {
          subAccountField.html(
            '<option value="">Lỗi khi tải tài khoản ảo. Vui lòng thử lại.</option>',
          );
        },
      });
    }, 300);
  });

  const checkedBankAccount = jQuery(".wc-sepay-account-item input:checked");
  if (checkedBankAccount.length) {
    checkedBankAccount.trigger("change");
    jQuery(".wc-sepay-account-list").animate(
      {
        scrollTop: checkedBankAccount.offset().top - 100,
      },
      500,
    );
  }

  if (
    bankAccountField.length &&
    bankAccountField.val() &&
    subAccountField.val()
  ) {
    setTimeout(function () {
      const savedSubAccountValue = subAccountField.val();
      bankAccountField.trigger("change");

      if (savedSubAccountValue) {
        setTimeout(function () {
          if (
            subAccountField.find(`option[value="${savedSubAccountValue}"]`)
              .length
          ) {
            subAccountField.val(savedSubAccountValue);
          }
        }, 200);
      }
    }, 100);
  }

  function update_account_number_field_ui() {
    const bank = jQuery("#woocommerce_sepay_bank_select").val();
    const excludedSubAccountBanks = ["tpbank", "vpbank", "vietinbank"];
    const requiredSubAccountBanks = ["bidv", "ocb", "msb", "kienlongbank"];

    if (
      requiredSubAccountBanks.includes(bank) &&
      !excludedSubAccountBanks.includes(bank)
    ) {
      jQuery("label[for=woocommerce_sepay_bank_account_number]").html("Số VA");
      jQuery("input[name=woocommerce_sepay_bank_account_number]")
        .parent()
        .find(".help-text")
        .html(
          "Vui lòng điền chính xác <strong>số VA</strong> để nhận được biến động giao dịch.",
        );
    } else {
      jQuery("label[for=woocommerce_sepay_bank_account_number]").html(
        "Số tài khoản",
      );
      jQuery("input[name=woocommerce_sepay_bank_account_number]")
        .parent()
        .find(".help-text")
        .html(
          "Vui lòng điền chính xác <strong>số tài khoản ngân hàng</strong> để nhận được biến động giao dịch.",
        );
    }
  }
  function check_url_site() {
    let base_url = jQuery("#woocommerce_sepay_url_root").val();
    let url = base_url + "/wp-json/sepay-gateway/v1/add-payment";

    if (!base_url) {
      jQuery("#content-render").css("display", "none");
      return;
    } else {
      jQuery("#content-render").css("display", "block");
    }

    jQuery.ajax({
      url: url,
      type: "POST",
      contentType: "application/json",
      success: function (response) {
        // console.log("result: " + response);
        jQuery("#site_url").html(url);
      },
      error: function (xhr, status, error) {
        // console.error("Exception:", error);
        jQuery("#site_url").html(
          base_url + "/?rest_route=/sepay-gateway/v1/add-payment",
        );
      },
    });
  }
  jQuery("document").ready(() => {
    jQuery("input[name=woocommerce_sepay_bank_account_number]")
      .parent()
      .append(
        '<div class="help-text" style="box-sizing: border-box; color: #856404; background-color: #fff3cd; border-color: #ffeeba; padding: .75rem 1.25rem; border-radius: .25rem; border: 1px solid transparent; margin-top: 0.5rem; max-width: 400px;"></div>',
      );
    update_account_number_field_ui();

    jQuery("#woocommerce_sepay_bank_select").on("change", (event) => {
      update_account_number_field_ui();
    });
    check_url_site();
  });
});
