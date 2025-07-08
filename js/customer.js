document.addEventListener('DOMContentLoaded', function() {
    const startOrderBtn = document.getElementById('startOrderBtn');
    const tableNumberInput = document.getElementById('tableNumber');
    const tableNumberDisplay = document.getElementById('tableNumberDisplay');
    const menuSection = document.querySelector('.menu-section');
    const orderSection = document.querySelector('.order-section');
    const confirmationSection = document.querySelector('.confirmation-section');
    const menuItemsContainer = document.getElementById('menuItems');
    const orderItemsContainer = document.getElementById('orderItems');
    const totalAmountElement = document.getElementById('totalAmount');
    const submitOrderBtn = document.getElementById('submitOrderBtn');
    const newOrderBtn = document.getElementById('newOrderBtn');
    const categoryButtons = document.querySelectorAll('.category-btn');

    let currentTableNumber = null;
    let menuItems = [];
    let orderItems = [];
    let totalAmount = 0;

    // بدء طلب جديد
    startOrderBtn.addEventListener('click', function() {
        const tableNumber = tableNumberInput.value.trim();
        
        if (!tableNumber) {
            alert('الرجاء إدخال رقم الطاولة');
            return;
        }

        currentTableNumber = tableNumber;
        tableNumberDisplay.textContent = `طلب الطاولة رقم ${tableNumber}`;
        tableNumberInput.disabled = true;
        startOrderBtn.disabled = true;
        menuSection.classList.remove('hidden');
        orderSection.classList.remove('hidden');
        
        loadMenuItems();
    });

    // تحميل عناصر القائمة من Firebase
    function loadMenuItems() {
        database.ref('menu').on('value', (snapshot) => {
            menuItems = [];
            snapshot.forEach((childSnapshot) => {
                const item = childSnapshot.val();
                item.id = childSnapshot.key;
                menuItems.push(item);
            });
            renderMenuItems('all');
        });
    }

    // عرض عناصر القائمة
    function renderMenuItems(category) {
        menuItemsContainer.innerHTML = '';
        
        const filteredItems = category === 'all' 
            ? menuItems 
            : menuItems.filter(item => item.category === category);
        
        filteredItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'menu-item';
            itemElement.innerHTML = `
                <h3>${item.name}</h3>
                <p>${item.description || ''}</p>
                <div class="item-footer">
                    <span class="price">${item.price} ج.م</span>
                    <button class="add-to-order" data-id="${item.id}">إضافة</button>
                </div>
            `;
            menuItemsContainer.appendChild(itemElement);
        });

        // إضافة مستمعين لأزرار الإضافة
        document.querySelectorAll('.add-to-order').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                addToOrder(itemId);
            });
        });
    }

    // إضافة عنصر إلى الطلب
    function addToOrder(itemId) {
        const item = menuItems.find(i => i.id === itemId);
        if (!item) return;

        const existingItem = orderItems.find(i => i.id === itemId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            orderItems.push({
                ...item,
                quantity: 1,
                notes: ''
            });
        }

        updateOrderDisplay();
    }

    // تحديث عرض الطلب
    function updateOrderDisplay() {
        orderItemsContainer.innerHTML = '';
        totalAmount = 0;

        orderItems.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            totalAmount += itemTotal;

            const itemElement = document.createElement('div');
            itemElement.className = 'order-item';
            itemElement.innerHTML = `
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <span class="item-price">${item.price} ج.م × ${item.quantity} = ${itemTotal} ج.م</span>
                </div>
                <div class="item-controls">
                    <input type="text" class="item-notes" placeholder="ملاحظات" value="${item.notes}" 
                        data-index="${index}">
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" data-index="${index}">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn plus" data-index="${index}">+</button>
                    </div>
                    <button class="remove-item" data-index="${index}">×</button>
                </div>
            `;
            orderItemsContainer.appendChild(itemElement);
        });

        totalAmountElement.textContent = `${totalAmount} ج.م`;

        // إضافة مستمعين لأزرار التحكم
        document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                const isPlus = this.classList.contains('plus');
                updateQuantity(index, isPlus);
            });
        });

        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                removeItem(index);
            });
        });

        document.querySelectorAll('.item-notes').forEach(input => {
            input.addEventListener('change', function() {
                const index = parseInt(this.getAttribute('data-index'));
                orderItems[index].notes = this.value;
            });
        });
    }

    // تحديث الكمية
    function updateQuantity(index, isPlus) {
        if (isPlus) {
            orderItems[index].quantity += 1;
        } else {
            if (orderItems[index].quantity > 1) {
                orderItems[index].quantity -= 1;
            } else {
                orderItems.splice(index, 1);
            }
        }
        updateOrderDisplay();
    }

    // إزالة عنصر
    function removeItem(index) {
        orderItems.splice(index, 1);
        updateOrderDisplay();
    }

    // تأكيد الطلب
    submitOrderBtn.addEventListener('click', function() {
        if (orderItems.length === 0) {
            alert('الرجاء إضافة عناصر إلى الطلب');
            return;
        }

        const orderData = {
            tableNumber: currentTableNumber,
            items: orderItems,
            total: totalAmount,
            status: 'pending',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        database.ref('orders').push(orderData)
            .then(() => {
                menuSection.classList.add('hidden');
                orderSection.classList.add('hidden');
                confirmationSection.classList.remove('hidden');
            })
            .catch(error => {
                alert('حدث خطأ أثناء إرسال الطلب: ' + error.message);
            });
    });

    // طلب جديد
    newOrderBtn.addEventListener('click', function() {
        currentTableNumber = null;
        orderItems = [];
        totalAmount = 0;
        
        tableNumberInput.value = '';
        tableNumberInput.disabled = false;
        startOrderBtn.disabled = false;
        
        confirmationSection.classList.add('hidden');
    });

    // تصفية العناصر حسب الفئة
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            renderMenuItems(category);
        });
    });
});
