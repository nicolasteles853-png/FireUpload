FROM php:8.2-apache

# Instala extensões PHP que você possa precisar
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Copia todos os arquivos para o diretório do Apache
COPY . /var/www/html/

# Dá permissão para escrita nas pastas de uploads e logs
RUN chown -R www-data:www-data /var/www/html/uploads /var/www/html/logs

# Expõe a porta 80
EXPOSE 80

# Comando padrão para iniciar o Apache
CMD ["apache2-foreground"]
